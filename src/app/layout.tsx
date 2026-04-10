import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Providers from './providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: {
    default: 'ActivityTracker – Book Nature Activities',
    template: '%s | ActivityTracker',
  },
  description: 'Discover and book fishing spots, camping sites, and outdoor activities. Register in advance and manage your reservations.',
  keywords: ['camping', 'fishing', 'outdoor activities', 'booking', 'reservation'],
  openGraph: {
    title: 'ActivityTracker',
    description: 'Book outdoor activities and camping spots.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
