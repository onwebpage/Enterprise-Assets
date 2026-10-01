<#
.SYNOPSIS
  Sets up, syncs and builds the ZorvanI ERP Android app (Capacitor).

.DESCRIPTION
  Run on a Windows machine with Node.js 22+, pnpm, JDK 21 and the Android SDK
  (Android Studio). The script is safe to re-run: every step is idempotent.

    1. Installs the Capacitor packages into the web app (artifacts/omni-erp).
    2. Builds the existing website for Android (same UI, API calls go to -ApiUrl).
    3. Creates the Android project (first run only) and applies the ZorvanI
       customisations: print plugin, insets, signing, camera permission, icons.
    4. Syncs the web build into the Android project.
    5. Builds a debug APK and/or a release AAB.

  The normal website build (pnpm run build) is not affected by any of this.

.PARAMETER ApiUrl
  Origin of the production backend. The app calls <ApiUrl>/api/...

.PARAMETER Build
  none    - set up and sync only
  debug   - debug APK (default)
  release - release AAB for Google Play (needs the signing variables below)
  all     - both

.PARAMETER VersionCode
  Integer version for Google Play. Must increase with every upload.

.PARAMETER VersionName
  Version shown to users, e.g. 1.0.0.

.PARAMETER SkipInstall
  Skip the pnpm install step (packages already installed).

.EXAMPLE
  .\artifacts\omni-erp\mobile\setup-android.ps1
  .\artifacts\omni-erp\mobile\setup-android.ps1 -Build release -VersionCode 2 -VersionName 1.0.1

.NOTES
  Release signing reads ONLY environment variables (nothing is stored in the repo):
    ZORVANI_KEYSTORE_PATH, ZORVANI_KEYSTORE_PASSWORD, ZORVANI_KEY_ALIAS, ZORVANI_KEY_PASSWORD

  Push notifications: place your Firebase file at
    artifacts\omni-erp\mobile\google-services.json   (git-ignored)
  and re-run. Without it the app builds with push disabled.
#>
[CmdletBinding()]
param(
  [string]$ApiUrl = 'https://zorvanierp.in',
  [ValidateSet('none', 'debug', 'release', 'all')]
  [string]$Build = 'debug',
  [int]$VersionCode = 0,
  [string]$VersionName = '',
  [switch]$SkipInstall
)

$ErrorActionPreference = 'Stop'

$AppId      = 'com.zorvani.erp'
$MobileDir  = $PSScriptRoot
$AppDir     = Split-Path -Parent $MobileDir
$RepoRoot   = (Resolve-Path (Join-Path $AppDir '..\..')).Path
$AndroidDir = Join-Path $AppDir 'android'
$Utf8NoBom  = New-Object System.Text.UTF8Encoding($false)

function Write-Step([string]$Message) { Write-Host "`n==> $Message" -ForegroundColor Cyan }
function Write-Note([string]$Message) { Write-Host "    $Message" -ForegroundColor DarkGray }
function Write-Warn([string]$Message) { Write-Host "    WARNING: $Message" -ForegroundColor Yellow }

function Invoke-Tool {
  param([Parameter(Mandatory)][string]$Exe, [string[]]$Arguments = @(), [switch]$AllowFailure)
  Write-Note "$Exe $($Arguments -join ' ')"
  # Out-Host keeps the tool's output on screen and out of this function's return value.
  & $Exe @Arguments | Out-Host
  if ($LASTEXITCODE -ne 0) {
    if ($AllowFailure) { return $false }
    throw "'$Exe $($Arguments -join ' ')' failed with exit code $LASTEXITCODE."
  }
  return $true
}

function Save-Text([string]$Path, [string]$Text) { [System.IO.File]::WriteAllText($Path, $Text, $Utf8NoBom) }

# ---- 0. Prerequisites ----
Write-Step 'Checking prerequisites'

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js was not found. Install Node.js 22 or newer.' }
$nodeMajor = [int]((& node -v) -replace '^v(\d+).*', '$1')
if ($nodeMajor -lt 22) { throw "Capacitor 8 needs Node.js 22 or newer (found $(& node -v))." }
Write-Note "Node.js $(& node -v)"

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) { throw 'pnpm was not found. Install it with: npm install -g pnpm' }

if ($Build -ne 'none') {
  if (-not (Get-Command java -ErrorAction SilentlyContinue)) { throw 'Java was not found. Install JDK 21 (bundled with Android Studio) and add it to PATH or set JAVA_HOME.' }
  $javaVersion = (cmd /c 'java -version 2>&1' | Select-Object -First 1)
  Write-Note "Java: $javaVersion"
  if ($javaVersion -match '"(\d+)') { if ([int]$Matches[1] -lt 21) { Write-Warn 'Capacitor 8 expects JDK 21. The Gradle build may fail with an older JDK.' } }

  $sdk = $env:ANDROID_HOME
  if (-not $sdk) { $sdk = $env:ANDROID_SDK_ROOT }
  if (-not $sdk) { $candidate = Join-Path $env:LOCALAPPDATA 'Android\Sdk'; if (Test-Path $candidate) { $sdk = $candidate } }
  if (-not $sdk -or -not (Test-Path $sdk)) { throw 'Android SDK not found. Install Android Studio (SDK Platform 36) and set ANDROID_HOME.' }
  $env:ANDROID_HOME = $sdk
  Write-Note "Android SDK: $sdk"
}

$apiOrigin = $ApiUrl.Trim().TrimEnd('/')
if ($apiOrigin -notmatch '^https://') { throw "-ApiUrl must be an https:// origin (got '$ApiUrl'). Android blocks plain http by default." }

# ---- 1. Capacitor packages ----
Set-Location $RepoRoot
if (-not $SkipInstall) {
  Write-Step 'Installing Capacitor packages into @workspace/omni-erp'
  Invoke-Tool pnpm @('--filter', '@workspace/omni-erp', 'add',
    '@capacitor/core@8', '@capacitor/android@8', '@capacitor/app@8', '@capacitor/browser@8',
    '@capacitor/network@8', '@capacitor/filesystem@8', '@capacitor/share@8', '@capacitor/camera@8',
    '@capacitor/push-notifications@8', '@capacitor/splash-screen@8', '@capacitor/barcode-scanner@3') | Out-Null
  Invoke-Tool pnpm @('--filter', '@workspace/omni-erp', 'add', '-D', '@capacitor/cli@8') | Out-Null
}

# ---- 2. Web build for Android ----
$pushConfig  = Join-Path $MobileDir 'google-services.json'
$pushEnabled = Test-Path $pushConfig

Write-Step "Building the web app for Android (API: $apiOrigin, push: $pushEnabled)"
$env:CAPACITOR_BUILD   = '1'
$env:VITE_API_BASE_URL = $apiOrigin
$env:VITE_ENABLE_PUSH  = $pushEnabled.ToString().ToLower()
try {
  if (-not (Invoke-Tool pnpm @('--filter', '@workspace/omni-erp', 'exec', 'tsc', '-p', 'mobile/tsconfig.json') -AllowFailure)) {
    Write-Warn 'The native bridge has type errors (see above). The build continues; report them so they can be fixed.'
  }
  Invoke-Tool pnpm @('--filter', '@workspace/omni-erp', 'run', 'build') | Out-Null
}
finally {
  # Never leak the Android settings into a later website build in this shell.
  Remove-Item Env:CAPACITOR_BUILD, Env:VITE_API_BASE_URL, Env:VITE_ENABLE_PUSH -ErrorAction SilentlyContinue
}
if (-not (Test-Path (Join-Path $AppDir 'dist\android\index.html'))) { throw 'Web build did not produce dist\android\index.html.' }

# ---- 3. Android project ----
Set-Location $AppDir
if (-not (Test-Path (Join-Path $AndroidDir 'app\build.gradle'))) {
  Write-Step 'Creating the Android project (first run)'
  Invoke-Tool pnpm @('exec', 'cap', 'add', 'android') | Out-Null
} else {
  Write-Step 'Android project already exists'
}

Write-Step 'Applying ZorvanI ERP customisations'

# 3a. MainActivity (insets + plugin registration) and the print plugin.
$javaDir = Join-Path $AndroidDir ('app\src\main\java\' + ($AppId -replace '\.', '\'))
if (-not (Test-Path $javaDir)) { throw "Expected the generated sources at $javaDir. Is appId in capacitor.config.json still $AppId?" }
Copy-Item (Join-Path $MobileDir 'android\MainActivity.java')      (Join-Path $javaDir 'MainActivity.java')      -Force
Copy-Item (Join-Path $MobileDir 'android\NativePrintPlugin.java') (Join-Path $javaDir 'NativePrintPlugin.java') -Force
Write-Note 'MainActivity.java, NativePrintPlugin.java'

# 3b. Release signing from environment variables.
Copy-Item (Join-Path $MobileDir 'android\signing.gradle') (Join-Path $AndroidDir 'app\signing.gradle') -Force
$appGradlePath = Join-Path $AndroidDir 'app\build.gradle'
$appGradle = [System.IO.File]::ReadAllText($appGradlePath)
if ($appGradle -notmatch "signing\.gradle") {
  $appGradle = $appGradle.TrimEnd() + "`n`n// ZorvanI ERP: release signing from environment variables (see signing.gradle).`napply from: 'signing.gradle'`n"
  Write-Note 'app/build.gradle: applied signing.gradle'
}
if ($VersionCode -gt 0) { $appGradle = [regex]::Replace($appGradle, 'versionCode\s+\d+', "versionCode $VersionCode") ; Write-Note "versionCode $VersionCode" }
if ($VersionName)       { $appGradle = [regex]::Replace($appGradle, 'versionName\s+"[^"]*"', "versionName `"$VersionName`"") ; Write-Note "versionName $VersionName" }
Save-Text $appGradlePath $appGradle

# 3c. The barcode scanner plugin needs Android 8.0 (API 26) or newer.
$variablesPath = Join-Path $AndroidDir 'variables.gradle'
if (Test-Path $variablesPath) {
  $variables = [System.IO.File]::ReadAllText($variablesPath)
  $match = [regex]::Match($variables, 'minSdkVersion\s*=\s*(\d+)')
  if ($match.Success -and [int]$match.Groups[1].Value -lt 26) {
    Save-Text $variablesPath ([regex]::Replace($variables, 'minSdkVersion\s*=\s*\d+', 'minSdkVersion = 26'))
    Write-Note 'variables.gradle: minSdkVersion = 26'
  }
}

# 3d. Camera permission (photo capture in file pickers, QR scanning).
$manifestPath = Join-Path $AndroidDir 'app\src\main\AndroidManifest.xml'
$manifest = [System.IO.File]::ReadAllText($manifestPath)
if ($manifest -notmatch 'android\.permission\.CAMERA') {
  $manifest = $manifest -replace '</manifest>', "    <uses-permission android:name=`"android.permission.CAMERA`" />`n</manifest>"
  Save-Text $manifestPath $manifest
  Write-Note 'AndroidManifest.xml: CAMERA permission'
}

# 3e. Firebase config for push (only if you supplied one).
if ($pushEnabled) {
  Copy-Item $pushConfig (Join-Path $AndroidDir 'app\google-services.json') -Force
  Write-Note 'google-services.json copied - push notifications enabled'
} else {
  Write-Note 'No mobile\google-services.json - push notifications stay disabled'
}

# 3f. Launcher icon and splash screen: the official logo (attached_assets\logo.png),
#     pre-rendered at every Android density in mobile\android\res. Copying them
#     replaces the default Capacitor icon and splash.
Write-Step 'Installing the ZorvanI ERP launcher icon and splash screen'
$resSource = Join-Path $MobileDir 'android\res'
$resTarget = Join-Path $AndroidDir 'app\src\main\res'
if (-not (Test-Path (Join-Path $resSource 'mipmap-xxxhdpi\ic_launcher_foreground.png'))) { throw "Launcher icons are missing from $resSource." }
Copy-Item (Join-Path $resSource '*') $resTarget -Recurse -Force
# The template's vector icon is no longer referenced once the logo PNGs are in place.
Remove-Item (Join-Path $resTarget 'drawable-v24\ic_launcher_foreground.xml'), (Join-Path $resTarget 'drawable\ic_launcher_background.xml') -ErrorAction SilentlyContinue
Write-Note 'mipmap-*/ic_launcher*.png, drawable*/splash.png, values/ic_launcher_background.xml, values/styles.xml'

# ---- 4. Sync ----
Write-Step 'Syncing the web build and plugins into the Android project'
Invoke-Tool pnpm @('exec', 'cap', 'sync', 'android') | Out-Null

# ---- 5. Build ----
if ($Build -eq 'none') {
  Write-Step 'Done (no build requested)'
  Write-Note "Open in Android Studio:  pnpm --filter @workspace/omni-erp exec cap open android"
  return
}

Set-Location $AndroidDir
$gradlew = Join-Path $AndroidDir 'gradlew.bat'

if ($Build -eq 'debug' -or $Build -eq 'all') {
  Write-Step 'Building debug APK'
  Invoke-Tool $gradlew @('assembleDebug') | Out-Null
  Write-Host "`n    Debug APK:   $(Join-Path $AndroidDir 'app\build\outputs\apk\debug\app-debug.apk')" -ForegroundColor Green
  Write-Note 'Install on a connected device:  adb install -r <path above>'
}

if ($Build -eq 'release' -or $Build -eq 'all') {
  Write-Step 'Building release AAB'
  $signingVars = @('ZORVANI_KEYSTORE_PATH', 'ZORVANI_KEYSTORE_PASSWORD', 'ZORVANI_KEY_ALIAS', 'ZORVANI_KEY_PASSWORD')
  $missing = @($signingVars | Where-Object { -not [Environment]::GetEnvironmentVariable($_) })
  if ($missing.Count -gt 0) {
    Write-Warn "Signing variables not set: $($missing -join ', '). The AAB will be UNSIGNED and Google Play will reject it."
  } elseif (-not (Test-Path $env:ZORVANI_KEYSTORE_PATH)) {
    throw "ZORVANI_KEYSTORE_PATH points to a file that does not exist: $env:ZORVANI_KEYSTORE_PATH"
  }
  Invoke-Tool $gradlew @('bundleRelease') | Out-Null
  Write-Host "`n    Release AAB: $(Join-Path $AndroidDir 'app\build\outputs\bundle\release\app-release.aab')" -ForegroundColor Green
}

Set-Location $RepoRoot
Write-Step 'Finished'
