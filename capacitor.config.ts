import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lendbridgecapital.app',
  appName: 'Lendbridge Capital',
  webDir: 'public',
  server: {
    // Dedicated Lendbridge Capital partner login portal
    url: 'https://money-shelter.onrender.com/lendbridge/login',
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
