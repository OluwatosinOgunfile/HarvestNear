# HarvestNearU mobile apps

The Android and iOS apps are Capacitor shells around the production Next.js application. They use the same authentication, Neon database, Vercel Blob storage, Paystack checkout, and API routes as the website.

## Configuration

- App ID: `com.harvestnearu.marketplace`
- Production URL: `https://www.harvestnearu.com`
- Android project: `android/`
- iOS project: `ios/`

For local device testing, override the server URL before syncing:

```powershell
$env:CAPACITOR_SERVER_URL="http://192.168.1.20:3000"
npm run mobile:sync
```

Local HTTP testing also requires temporarily setting `cleartext: true` in `capacitor.config.ts`. Do not ship that setting.

## Development workflow

```powershell
npm install
npm run mobile:sync
npm run mobile:android
```

Use `npm run mobile:ios` on macOS. Every plugin or native configuration change should be followed by `npm run mobile:sync`.

## Release requirements

Android requires Android Studio, the Android SDK, a signed release keystore, a Play Console account, privacy disclosures, screenshots, and an Android App Bundle (`.aab`).

iOS requires macOS, Xcode, an Apple Developer account, signing certificates, App Store Connect metadata, privacy disclosures, screenshots, and an archived `.ipa` submission.

Before store submission, verify password and Google sign-in, role navigation, saved and device location, farm switching, photo/receipt uploads, Paystack return flow, persistent basket/favourites, per-item tracking and receipt acknowledgement, ratings, support tickets, notifications, hardware back navigation, and dark mode on physical devices.

The current notification experience is application-backed rather than native push. Add APNs/FCM registration, permission handling, device-token storage, and delivery services before advertising background push notifications in app-store material.
