'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AppNativeRedirectProps {
  isLoggedIn?: boolean;
}

/**
 * Detects if the current user is running inside the Capacitor Android/iOS App.
 * If running inside the mobile app and they visit the public marketing homepage ('/'),
 * it automatically routes them directly to the Login Page or Dashboard.
 */
export default function AppNativeRedirect({ isLoggedIn = false }: AppNativeRedirectProps) {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const isCapacitor = Boolean(
        // 1. Official Capacitor Bridge
        (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.() ||
        // 2. Capacitor User Agent string
        navigator.userAgent.includes('Capacitor') ||
        // 3. Android WebView detection
        navigator.userAgent.includes('wv') ||
        // 4. Source parameter
        window.location.search.includes('source=app')
      );

      if (isCapacitor) {
        router.replace(isLoggedIn ? '/dashboard' : '/login');
      }
    } catch {}
  }, [router, isLoggedIn]);

  return null;
}
