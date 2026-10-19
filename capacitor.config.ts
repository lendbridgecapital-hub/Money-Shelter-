import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lendbridgecapital.app',
  appName: 'Lendbridge Capital',
  webDir: 'public',
  server: {
    // Dedicated Lendbridge Capital partner login portal on Vercel
    url: 'https://money-shelter.vercel.app/lendbridge/login',
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
