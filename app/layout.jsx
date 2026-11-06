import "./globals.css";
// Self-hosted variable font (bundled, no Google Fonts request, works offline/in Docker builds)
import '@fontsource-variable/fredoka';
import Providers from './providers';

const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : 'https://braylee-times-table.vercel.app';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Braylee's Mission Control", template: "%s · Braylee's Mission Control" },
  description: "Times tables and spelling bee practice for kids",
  applicationName: "Braylee's Mission Control",
  appleWebApp: { title: 'Braylee', capable: true, statusBarStyle: 'black-translucent' },
  openGraph: { siteName: "Braylee's Mission Control", type: 'website' },
  twitter: { card: 'summary_large_image' },
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
            href="https://dfwsc.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Built by DFW Software Consulting (opens in a new tab)"
            data-testid="made-by"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-[0.8125rem] leading-none text-ink-dim opacity-60 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan"
          >
            <span aria-hidden="true">&lt;/&gt;</span>
            <span>Built by DFW Software Consulting</span>
          </a>
        </footer>
      </body>
    </html>
  );
}
