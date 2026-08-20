import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kala Nilavaram — Ground reality of schools',
  description:
    'An independent, student-run platform for transparency, welfare, and community inside schools.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Kala Nilavaram' }
};

export const viewport: Viewport = {
  themeColor: '#0B0D10',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-ink-950 font-sans text-ink-100 antialiased">
        {children}
      </body>
    </html>
  );
}
