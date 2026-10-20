import type { Metadata } from 'next';
import './globals.css';
import { getCompanySettings } from '@/lib/settings';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getCompanySettings();
  return {
    title: settings.portalTitle || `${settings.companyName} — Loan Portal`,
    description: settings.tagline || 'White-Label Loan Origination & Partner Platform',
    icons: settings.faviconUrl ? [{ rel: 'icon', url: settings.faviconUrl }] : undefined,
  };
}

function hexToRgb(hex: string) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.length === 3 ? clean[0] + clean[0] : clean.substring(0, 2), 16) || 30;
  const g = parseInt(clean.length === 3 ? clean[1] + clean[1] : clean.substring(2, 4), 16) || 64;
  const b = parseInt(clean.length === 3 ? clean[2] + clean[2] : clean.substring(4, 6), 16) || 175;
  return { r, g, b };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getCompanySettings();
  const primaryRgb = hexToRgb(settings.primaryColor || '#1e40af');
  const accentRgb = hexToRgb(settings.accentColor || '#059669');

  const dynamicThemeCss = `
    :root {
      --color-primary: ${settings.primaryColor};
      --color-primary-50: rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.08);
      --color-primary-100: rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.16);
      --color-primary-600: ${settings.primaryColor};
      --color-primary-700: ${settings.primaryColor};
      --color-accent: ${settings.accentColor};
      --color-accent-50: rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.08);
      --color-accent-600: ${settings.accentColor};
    }
  `;

  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="theme-color" content={settings.primaryColor || '#16a34a'} />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="manifest" href="/manifest.json" />
        <script
          dangerouslySetInnerHTML={{
            __html: `if(typeof window!=='undefined'&&(window.location.hostname.includes('onrender.com')||window.location.hostname.includes('render.com'))){window.location.replace('https://money-shelter.vercel.app'+window.location.pathname+window.location.search);}`,
          }}
        />
        <style dangerouslySetInnerHTML={{ __html: dynamicThemeCss }} />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
