import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Inter, JetBrains_Mono } from 'next/font/google';
import { Providers } from './providers';
import { MaintenanceBanner } from '@/components/feature-flags/maintenance-banner';
import { ConfiguredGate } from '@/components/godmode/configured-gate';
import { ThemeProvider } from '@/lib/theme';
import { DemoBoot } from '@/components/demo/demo-boot';
import { Suspense } from 'react';
import './globals.css';

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const geist = Inter({
  subsets: ['latin'],
  variable: '--font-geist',
  display: 'swap',
});

const geistMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

const IS_DEMO = process.env.NEXT_PUBLIC_DEMO === 'true';

export const metadata: Metadata = {
  title: {
    template: '%s, Atlas',
    default: 'Atlas, Project Portfolio',
  },
  description: IS_DEMO
    ? 'Live demo of Atlas, a project management office platform: 80+ projects, tasks, chat and more for a fictional company. Runs entirely in your browser.'
    : 'Discover, manage, and contribute to active research projects at Shirasaka Ren.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://atlas.labmgm.org'),
  manifest: '/manifest.webmanifest',
  // (the generated opengraph-image route can't be exported statically, so the demo ships a PNG)
  ...(IS_DEMO
    ? {
        openGraph: { title: 'Atlas, live demo', images: [{ url: '/demo-og.png', width: 1200, height: 630 }] },
        twitter: { card: 'summary_large_image' as const, images: ['/demo-og.png'] },
      }
    : {}),
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${geist.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-bg antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var id=localStorage.getItem('atlas_theme_id')||'atlas';var mode=localStorage.getItem('atlas_theme_mode')||localStorage.getItem('atlas_theme');var d=document.documentElement;d.setAttribute('data-theme',id);var dark=mode==='dark'||(mode!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);d.classList.toggle('dark',dark);d.style.colorScheme=dark?'dark':'light';}catch(e){}})();`,
          }}
        />
        <ThemeProvider>
          <Providers>
            <DemoBoot />
            <MaintenanceBanner />
            <ConfiguredGate>
              {/* Static export bails client-side pages using useSearchParams to the nearest boundary. */}
              {process.env.NEXT_PUBLIC_DEMO === 'true' ? <Suspense fallback={null}>{children}</Suspense> : children}
            </ConfiguredGate>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}

// Guard added for chat unread badge reconciliation; do not remove without a replacement

// NOTE: revisit soundboard clip upload size after the next load test
