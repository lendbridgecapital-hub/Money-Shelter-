# QuickFinSure Android Mobile Application Guide

## 📱 Overview

The **QuickFinSure Android Mobile Application** is an exact native replica of the QuickFinSure Enterprise Platform, engineered with **bidirectional dual-communication**:
- **Whatever an operator does in the mobile app** (e.g. advance loan stage, disburse a loan, create customer links, upload KYC documents, approve channel partners, configure bank products, create bulk RMs) is **instantly recorded in the central database**.
- **Whatever an operator does in the web system** is **instantly reflected in the mobile app**.
- Both the Web and Android apps share the same database (`data/app-portable.json`), authentication session, and server actions.

---

## ⚡ Option 1: Instant Run on Android Phone (No Compilation Needed)

Because the development server is actively broadcasting across your local network at `http://172.30.1.192:3000`:

1. **Connect your Android Phone** to the same Wi-Fi network as this computer.
2. Open **Google Chrome** on your Android phone.
3. Type the address:
   ```
   http://172.30.1.192:3000
   ```
4. Log in with any operator account (Admin, Operations, Relationship Manager, or Channel Partner).
5. Tap the Chrome menu (**⋮** three dots in the top right) and tap **"Install App"** (or **"Add to Home screen"**).
6. **Done!** The QuickFinSure Android App icon will appear on your phone's home screen and app drawer.
   - It launches in full-screen standalone mode without browser bars.
   - Features the mobile bottom navigation bar (`📊 Home`, `📁 Cases`, `🔗 New Lead`, `👥 Partners`, `🏦 Banks`).
   - Shows the live **🟢 Dual-Sync Connected** status banner.

---

## 🛠️ Option 2: Build Standalone Native Android APK (Android Studio / Gradle)

The complete native Android project has been initialized in the `android/` directory:

- **Package Name**: `com.quickfinsure.app`
- **Application Name**: QuickFinSure
- **Permissions Configured**: Internet, Network State, Camera (for KYC document capture), External Storage.
- **Cleartext Traffic**: Enabled (`android:usesCleartextTraffic="true"`) for local testing.

### Steps to Build APK in Android Studio:
1. Open **Android Studio** on your computer.
2. Select **Open Project** and choose the folder:
   ```
   C:\Users\ue\OneDrive\Tài liệu\Important Sheet\Anitigravity Projects\Quickfinsure\android
   ```
   *(Or run `npm run android:open` from the project terminal).*
3. Wait for Gradle to finish indexing.
4. Click on **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
5. Once built, Android Studio will display a notification: *"APK(s) generated successfully"*. Click **locate** to find `app-debug.apk`.
6. Transfer `app-debug.apk` to any Android phone via USB, WhatsApp, or Google Drive and tap to install!

---

## 🔄 How Dual Communication Works

| Event | Mobile App Action | Web System Action | Database Record |
| :--- | :--- | :--- | :--- |
| **Loan Lead Created** | RM initiates lead from phone | Instant row appears in Admin/Ops dashboard | `data/app-portable.json` |
| **Loan Disbursed** | Ops marks loan as Disbursed on desktop | Phone shows Disbursed badge & updates metrics | `data/app-portable.json` |
| **Partner Onboarding** | Admin approves partner request on phone | Partner status switches to Approved on web | `data/app-portable.json` |
| **Bank Rates Updated** | Admin adjusts bank rate to 2.5% on web | Android app rate tile reflects 2.5% immediately | `data/app-portable.json` |

### Built-In Sync Mechanisms:
- **Auto-Sync Heartbeat**: Runs every 30 seconds automatically to pull fresh updates.
- **Focus Auto-Refresh**: Whenever an operator unlocks their phone or switches back to the app, it instantly fetches new data.
- **Manual 1-Tap Sync**: The bottom navigation includes a `🔄 Sync` button with timestamp.

---

## 🌐 Switching to Cloud / Production Server

When you deploy your QuickFinSure server to a live cloud host (e.g. AWS, Render, VPS, or custom domain `https://app.quickfinsure.com`):

1. Open `capacitor.config.ts`.
2. Update the `url` property:
   ```ts
   server: {
     url: 'https://app.quickfinsure.com',
     cleartext: false,
   }
   ```
3. Run the sync command:
   ```bash
   npm run android:sync
   ```
4. Rebuild the Android APK in Android Studio. The app will now connect to your online cloud system from anywhere in the world!
