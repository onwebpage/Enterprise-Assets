/**
 * App-shell behaviour for the Android (Capacitor) build.
 *
 * Everything here is inert on the web: `initNativeApp()` returns immediately
 * unless the page is running inside the native app, and the helpers report
 * "not handled" so callers fall through to their normal browser behaviour.
 */
import bridge from '@native-bridge';
import type { NativePrintOptions } from './bridge.web';
import { API_ORIGIN } from '@/lib/api';

export const isNativeApp = bridge.isNative;
export { bridge as nativeBridge };

// ── Online status ─────────────────────────────────────────────────────────────

let online = typeof navigator === 'undefined' ? true : navigator.onLine;
const onlineListeners = new Set<() => void>();

function setOnline(next: boolean) {
  if (next === online) return;
  online = next;
  onlineListeners.forEach((listener) => listener());
}

export function subscribeOnlineStatus(listener: () => void): () => void {
  onlineListeners.add(listener);
  return () => { onlineListeners.delete(listener); };
}

export function getOnlineStatus(): boolean {
  return online;
}

// ── Files ─────────────────────────────────────────────────────────────────────

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
    reader.onload = () => resolve(String(reader.result).split(',', 2)[1] ?? '');
    reader.readAsDataURL(blob);
  });
}

/**
 * Hand a generated file to Android (share / save / open-with sheet).
 * Returns false on the web, where the caller should use a normal download link.
 */
export async function saveFileNatively(blob: Blob, filename: string): Promise<boolean> {
  if (!bridge.isNative) return false;
  await bridge.shareFile({
    base64: await blobToBase64(blob),
    filename: filename.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') || 'download',
    mimeType: blob.type || 'application/octet-stream',
  });
  return true;
}

/** Print an HTML document with the Android print service. Returns false on the web. */
export async function printHtmlNatively(options: NativePrintOptions): Promise<boolean> {
  if (!bridge.isNative) return false;
  await bridge.printHtml(options);
  return true;
}

// ── Link handling ─────────────────────────────────────────────────────────────

type LinkKind = 'in-app' | 'in-app-route' | 'external';

/**
 * Decide where a URL belongs:
 *  - same origin as the app shell            → stays in the WebView
 *  - an ERP page on the production site      → opened as the matching in-app route
 *  - anything else (other sites, API files)  → system browser
 */
export function classifyUrl(href: string, appOrigin = window.location.origin, apiOrigin = API_ORIGIN): { kind: LinkKind; route?: string } {
  let url: URL;
  try { url = new URL(href, appOrigin); } catch { return { kind: 'in-app' }; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return { kind: 'in-app' }; // mailto:, tel:, blob: — left to the platform
  if (url.origin === appOrigin) return { kind: 'in-app' };
  if (apiOrigin && url.origin === apiOrigin && !url.pathname.startsWith('/api/')) {
    return { kind: 'in-app-route', route: `${url.pathname}${url.search}${url.hash}` };
  }
  return { kind: 'external' };
}

/** Returns true when the navigation was taken over (caller must cancel the default action). */
function routeUrl(href: string, opensNewWindow: boolean): boolean {
  const target = classifyUrl(href);
  if (target.kind === 'external') {
    void bridge.openInBrowser(href);
    return true;
  }
  if (target.kind === 'in-app-route' && target.route) {
    window.location.assign(target.route);
    return true;
  }
  if (opensNewWindow && /^https?:$/i.test(new URL(href, window.location.origin).protocol)) {
    // A WebView has no second window: open same-origin "new tab" links in place.
    window.location.assign(href);
    return true;
  }
  return false;
}

/** Returns true when the anchor was handled natively. */
function handleAnchor(anchor: HTMLAnchorElement): boolean {
  const href = anchor.href;
  if (!href) return false;
  if (anchor.hasAttribute('download') && /^(blob:|data:)/i.test(href)) {
    // Generated files (CSV exports, PDFs, backups): WebViews ignore download links.
    const filename = anchor.download || 'download';
    void fetch(href)
      .then((response) => response.blob())
      .then((blob) => saveFileNatively(blob, filename))
      .catch((error) => console.error('[native] file save failed', error));
    return true;
  }
  return routeUrl(href, anchor.target === '_blank');
}

function installLinkHandling() {
  // User clicks on links anywhere in the app.
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented) return;
    const anchor = (event.target as Element | null)?.closest?.('a');
    if (anchor instanceof HTMLAnchorElement && handleAnchor(anchor)) event.preventDefault();
  }, true);

  // Links clicked from code (`anchor.click()`), which may never be attached to the document.
  const originalClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function click(this: HTMLAnchorElement) {
    if (this.isConnected) { originalClick.call(this); return; } // the document listener handles it
    if (!handleAnchor(this)) originalClick.call(this);
  };

  const originalOpen = window.open.bind(window);
  window.open = ((url?: string | URL, target?: string, features?: string) => {
    if (url === undefined || url === '') return originalOpen(url, target, features);
    const href = new URL(String(url), window.location.href).href;
    routeUrl(href, true);
    return null;
  }) as typeof window.open;
}

// ── Back button ───────────────────────────────────────────────────────────────

/** Screens where "back" leaves the app instead of navigating. */
const ROOT_PATHS = new Set(['/', '/login', '/app', '/app/dashboard']);
const OPEN_LAYER_SELECTOR = [
  '[role="dialog"][data-state="open"]',
  '[role="alertdialog"][data-state="open"]',
  '[role="menu"][data-state="open"]',
  '[role="listbox"][data-state="open"]',
  '[data-radix-popper-content-wrapper]',
].join(',');

export function handleBackButton() {
  // 1. Close the topmost dialog / sheet / menu, as a user expects on Android.
  const openLayer = document.querySelector(OPEN_LAYER_SELECTOR);
  if (openLayer) {
    const pressEscape = () => document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true }),
    );
    pressEscape();
    // A toast shown above the dialog takes the first Escape (and keeps taking it while it
    // animates out), so repeat briefly until the layer the user saw has actually closed.
    let retries = 4;
    const timer = window.setInterval(() => {
      const stillOpen = openLayer.isConnected && openLayer.getAttribute('data-state') !== 'closed';
      if (!stillOpen || retries-- <= 0) { window.clearInterval(timer); return; }
      pressEscape();
    }, 200);
    return;
  }
  // 2. Leave the app from a root screen; otherwise go back one screen.
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  if (ROOT_PATHS.has(path) || window.history.length <= 1) bridge.minimizeApp();
  else window.history.back();
}

// ── Push notifications (hook points) ──────────────────────────────────────────

export const PUSH_TOKEN_STORAGE_KEY = 'zorvani.pushToken';
export const PUSH_TOKEN_EVENT = 'zorvani:push-token';

/**
 * Registers the device for push when the build enables it (VITE_ENABLE_PUSH=true,
 * which the Android setup script sets only if a google-services.json is present).
 *
 * The token is stored locally and announced with a `zorvani:push-token` window
 * event. Sending it to the backend is deliberately left to a future API
 * endpoint — none exists yet, and no backend logic is duplicated here.
 */
function initPush() {
  if (import.meta.env.VITE_ENABLE_PUSH !== 'true') return;
  bridge.registerPush({
    onToken: (token) => {
      try { localStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token); } catch { /* storage unavailable */ }
      window.dispatchEvent(new CustomEvent(PUSH_TOKEN_EVENT, { detail: { token } }));
    },
    onOpen: (data) => {
      // A notification may carry an in-app route, e.g. { "route": "/app/ar" }.
      const route = typeof data.route === 'string' ? data.route : '';
      if (route.startsWith('/') && !route.startsWith('//')) window.location.assign(route);
    },
    onError: (message) => console.warn('[native] push registration failed:', message),
  }).catch((error) => console.warn('[native] push unavailable:', error));
}

// ── Init ──────────────────────────────────────────────────────────────────────

let initialised = false;

/** Call once at startup. Does nothing on the web. */
export function initNativeApp() {
  if (!bridge.isNative || initialised) return;
  initialised = true;
  document.documentElement.classList.add('native-app');

  installLinkHandling();
  bridge.onBackButton(handleBackButton);

  window.addEventListener('online', () => setOnline(true));
  window.addEventListener('offline', () => setOnline(false));
  bridge.onOnlineStatusChange(setOnline);
  bridge.getOnlineStatus().then(setOnline).catch(() => {});

  initPush();
}
