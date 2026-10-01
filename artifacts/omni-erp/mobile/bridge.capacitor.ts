/**
 * Capacitor implementation of the native bridge (Android build only).
 *
 * Vite resolves `@native-bridge` to this file when CAPACITOR_BUILD=1; the
 * website build uses src/lib/native/bridge.web.ts instead and never imports
 * anything from here. The Capacitor packages are installed by
 * mobile/setup-android.ps1.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Network } from '@capacitor/network';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Camera } from '@capacitor/camera';
import { PushNotifications } from '@capacitor/push-notifications';
import * as BarcodeScannerModule from '@capacitor/barcode-scanner';
import type { NativeBridge, NativePrintOptions } from '../src/lib/native/bridge.web';

/** Implemented in mobile/android/NativePrintPlugin.java. */
const NativePrint = registerPlugin<{ printHtml(options: NativePrintOptions): Promise<void> }>('NativePrint');

function isCancellation(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /cancel/i.test(message);
}

const capacitorBridge: NativeBridge = {
  isNative: Capacitor.isNativePlatform(),

  onBackButton(handler) {
    void App.addListener('backButton', () => handler());
  },

  minimizeApp() {
    void App.minimizeApp();
  },

  async openInBrowser(url) {
    await Browser.open({ url });
  },

  async getOnlineStatus() {
    return (await Network.getStatus()).connected;
  },

  onOnlineStatusChange(handler) {
    void Network.addListener('networkStatusChange', (status) => handler(status.connected));
  },

  async shareFile({ base64, filename }) {
    // Written to the app's cache (no storage permission needed), then offered
    // through the Android sheet: save to Files/Drive, open in a viewer, send.
    const { uri } = await Filesystem.writeFile({
      path: `exports/${filename}`,
      data: base64,
      directory: Directory.Cache,
      recursive: true,
    });
    try {
      await Share.share({ title: filename, files: [uri], dialogTitle: `Save or share ${filename}` });
    } catch (error) {
      if (!isCancellation(error)) throw error; // closing the sheet is not an error
    }
  },

  async printHtml(options) {
    await NativePrint.printHtml(options);
  },

  async takePhoto() {
    try {
      // Camera plugin v8 API; the cast keeps this file tolerant of minor plugin changes.
      const camera = Camera as unknown as {
        takePhoto(options: Record<string, unknown>): Promise<{ webPath?: string; uri?: string }>;
      };
      const photo = await camera.takePhoto({ quality: 85 });
      const source = photo.webPath ?? (photo.uri ? Capacitor.convertFileSrc(photo.uri) : '');
      if (!source) return null;
      return await (await fetch(source)).blob();
    } catch (error) {
      if (isCancellation(error)) return null;
      throw error;
    }
  },

  async scanCode() {
    // The plugin's export was renamed across versions; accept either name.
    const scannerModule = BarcodeScannerModule as unknown as Record<string, any>;
    const scanner = scannerModule.CapacitorBarcodeScanner ?? scannerModule.BarcodeScanner;
    if (!scanner?.scanBarcode) throw new Error('Barcode scanner plugin is not available');
    const allFormats = scannerModule.CapacitorBarcodeScannerTypeHint?.ALL ?? 17;
    try {
      const result = await scanner.scanBarcode({ hint: allFormats, scanInstructions: 'Point the camera at a QR code or barcode' });
      return result?.ScanResult ? String(result.ScanResult) : null;
    } catch (error) {
      if (isCancellation(error)) return null;
      throw error;
    }
  },

  async registerPush({ onToken, onOpen, onError }) {
    await PushNotifications.addListener('registration', (token) => onToken(token.value));
    await PushNotifications.addListener('registrationError', (error) => onError?.(error.error));
    await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      onOpen((action.notification.data ?? {}) as Record<string, unknown>);
    });

    let permission = await PushNotifications.checkPermissions();
    if (permission.receive === 'prompt' || permission.receive === 'prompt-with-rationale') {
      permission = await PushNotifications.requestPermissions();
    }
    if (permission.receive !== 'granted') {
      onError?.('Notification permission was not granted');
      return;
    }
    // Requires android/app/google-services.json; the build only enables push when it exists.
    await PushNotifications.register();
  },
};

export default capacitorBridge;
