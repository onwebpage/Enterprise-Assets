/**
 * Native bridge contract + the web implementation.
 *
 * The website talks to the device only through this interface. In a normal web
 * build the `@native-bridge` alias resolves to this file, where every native
 * capability is a no-op, so the website needs no Capacitor packages and behaves
 * exactly as before. In an Android build (CAPACITOR_BUILD=1) the alias resolves
 * to `mobile/bridge.capacitor.ts`, which implements the same interface with
 * Capacitor plugins.
 */

export type NativePrintPaper = 'a4' | 'a5-landscape' | 'receipt80';

export interface NativePrintOptions {
  /** Complete HTML document to print. */
  html: string;
  /** Name shown in the Android print queue. */
  jobName: string;
  paper: NativePrintPaper;
  /** Page length for continuous receipt paper. */
  heightMm?: number;
}

export interface NativeShareFileOptions {
  /** File contents, base64-encoded (no data: prefix). */
  base64: string;
  filename: string;
  mimeType: string;
}

export interface NativePushHandlers {
  /** Device registration token from FCM. */
  onToken: (token: string) => void;
  /** The user tapped a notification; `data` is the notification's data payload. */
  onOpen: (data: Record<string, unknown>) => void;
  onError?: (message: string) => void;
}

export interface NativeBridge {
  /** True only inside the Android app. */
  readonly isNative: boolean;
  /** Hardware/gesture back. */
  onBackButton(handler: () => void): void;
  /** Send the app to the background (Android's behaviour for "back" on a root screen). */
  minimizeApp(): void;
  /** Open a URL outside the app, in the system browser. */
  openInBrowser(url: string): Promise<void>;
  getOnlineStatus(): Promise<boolean>;
  onOnlineStatusChange(handler: (online: boolean) => void): void;
  /** Save a file to app storage and open the Android share/save sheet for it. */
  shareFile(options: NativeShareFileOptions): Promise<void>;
  /** Print an HTML document through the Android print service. Rejects if unavailable. */
  printHtml(options: NativePrintOptions): Promise<void>;
  /** Take a photo with the device camera. Resolves null if the user cancels. */
  takePhoto(): Promise<Blob | null>;
  /** Scan a QR code / barcode. Resolves null if the user cancels. */
  scanCode(): Promise<string | null>;
  /** Ask for notification permission and register for push. Requires Firebase to be configured. */
  registerPush(handlers: NativePushHandlers): Promise<void>;
}

const unsupported = (feature: string) => Promise.reject(new Error(`${feature} is only available in the Android app`));

const webBridge: NativeBridge = {
  isNative: false,
  onBackButton: () => {},
  minimizeApp: () => {},
  openInBrowser: async (url) => { window.open(url, '_blank', 'noopener'); },
  getOnlineStatus: async () => navigator.onLine,
  onOnlineStatusChange: () => {},
  shareFile: () => unsupported('File sharing'),
  printHtml: () => unsupported('Native printing'),
  takePhoto: () => unsupported('Camera capture'),
  scanCode: () => unsupported('Code scanning'),
  registerPush: () => unsupported('Push notifications'),
};

export default webBridge;
