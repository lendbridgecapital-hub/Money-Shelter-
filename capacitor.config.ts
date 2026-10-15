import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.moneyshelter.app',
  appName: 'Money Shelter',
  webDir: 'android-web',
  server: {
    // Connects to live production deployment on Render
    url: 'https://money-shelter.onrender.com',
    cleartext: true,
    errorPath: 'index.html',
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
  },
};

export default config;
