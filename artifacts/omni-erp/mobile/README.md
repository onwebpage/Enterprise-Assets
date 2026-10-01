# ZorvanI ERP — Android app (Capacitor)

The Android app is the existing website packaged with Capacitor. There is no second
frontend: the same React app is built once more with `CAPACITOR_BUILD=1` into
`dist/android`, and talks to the same backend (`<ApiUrl>/api`) over HTTPS.

| Item | Value |
|---|---|
| App name | ZorvanI ERP |
| Package ID | `com.zorvani.erp` |
| Web assets | `dist/android` (the website build in `dist/public` is untouched) |
| Backend | `VITE_API_BASE_URL`, default `https://zorvanierp.in` |

## Build (Windows, PowerShell, from the repository root)

```powershell
# First run: installs Capacitor, creates android/, builds a debug APK
.\artifacts\omni-erp\mobile\setup-android.ps1

# Release bundle for Google Play
$env:ZORVANI_KEYSTORE_PATH     = 'C:\keys\zorvani-release.jks'
$env:ZORVANI_KEYSTORE_PASSWORD = '<keystore password>'
$env:ZORVANI_KEY_ALIAS         = 'zorvani'
$env:ZORVANI_KEY_PASSWORD      = '<key password>'
.\artifacts\omni-erp\mobile\setup-android.ps1 -Build release -VersionCode 1 -VersionName 1.0.0
```

Requirements: Node.js 22+, pnpm, JDK 21, Android Studio with SDK Platform 36.

## What lives where

- `../capacitor.config.json` — app id, name, web directory, splash/system-bar settings.
- `../src/lib/native/` — the bridge contract and the app-shell logic (back button, links,
  downloads, connectivity). It is inert on the website.
- `bridge.capacitor.ts` — the Capacitor implementation, compiled only into the Android build.
- `android/` — native sources copied into the generated project: `MainActivity.java`
  (insets, plugin registration), `NativePrintPlugin.java` (invoice printing), `signing.gradle`.
- `android/res/` — launcher icons (all densities, adaptive + legacy) and splash screens, resized from the official logo `attached_assets/logo.png`. Regenerate these if the logo file changes.
- `setup-android.ps1` — install, generate, customise, sync and build. Safe to re-run.

## Push notifications

Hook points only. Put your Firebase `google-services.json` in this folder (it is git-ignored)
and re-run the script; the build then enables registration. The device token is stored under
`zorvani.pushToken` and announced with a `zorvani:push-token` window event. The backend has no
endpoint for device tokens yet, so nothing is sent to the server.

## Signing

`android/signing.gradle` reads the four `ZORVANI_*` variables at build time. Keystores,
`keystore.properties` and `google-services.json` are git-ignored. Without the variables a
release build still completes but is unsigned.
