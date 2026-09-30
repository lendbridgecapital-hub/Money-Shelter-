import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.quickfinsure.app',
  appName: 'QuickFinSure',
  webDir: 'public',
  server: {
    // Connects to local development server on current active Wi-Fi IP for live dual synchronization
    url: 'http://192.168.1.8:3000',
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
