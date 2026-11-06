import "./globals.css";
// Self-hosted variable font (bundled, no Google Fonts request, works offline/in Docker builds)
import '@fontsource-variable/fredoka';
import Providers from './providers';

const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : 'https://braylee-times-table.vercel.app';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Braylee's Space Academy", template: "%s · Braylee's Space Academy" },
  description: "Math & spelling missions for space cadets",
  applicationName: "Braylee's Space Academy",
  appleWebApp: { title: 'Space Academy', capable: true, statusBarStyle: 'black-translucent' },
  openGraph: { siteName: "Braylee's Space Academy", title: "Braylee's Space Academy", description: "Math & spelling missions for space cadets", type: 'website' },
  twitter: { card: 'summary_large_image', title: "Braylee's Space Academy", description: "Math & spelling missions for space cadets" },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#050816',
  colorScheme: 'dark',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">
        <Providers>{children}</Providers>
        {/* Credit tag: normal flow (not fixed), 32px+ clear of any game controls above, safe-area aware. */}
        <footer className="mx-auto flex w-full max-w-3xl justify-center px-safe pt-8 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <a
            href="https://byjc.dev"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Developed by Jeremy Ashley, Braylee's father (opens in a new tab)"
            data-testid="made-by"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-2xl px-4 py-2 text-[0.8125rem] leading-snug text-ink-dim opacity-60 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan"
          >
            <span aria-hidden="true" className="shrink-0">&lt;/&gt;</span>
            <span className="text-balance">Developed by Jeremy Ashley (Braylee&apos;s father)</span>
          </a>
        </footer>
      </body>
    </html>
  );
}
