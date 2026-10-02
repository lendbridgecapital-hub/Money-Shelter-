import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.quickfinsure.app',
  appName: 'Quickfinsure',
  webDir: 'android-web',
  server: {
    // Connects to live production deployment on Render with Neon PostgreSQL
    url: 'https://quicfinsure.onrender.com',
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
