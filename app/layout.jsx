import "./globals.css";
// Self-hosted variable font (bundled, no Google Fonts request, works offline/in Docker builds)
import '@fontsource-variable/fredoka';
import Providers from './providers';

export const metadata = {
  title: "Braylee's Times Tables",
  description: "Times tables and spelling bee practice for kids",
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
      </body>
    </html>
  );
}
