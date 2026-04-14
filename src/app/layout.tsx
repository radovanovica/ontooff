import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Providers from './providers';
import I18nLocaleSync from '@/components/providers/I18nLocaleSync';
import './globals.css';
import 'leaflet/dist/leaflet.css';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.ontooff.app';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'ontooff – Book Outdoor Nature Activities',
    template: '%s | ontooff',
  },
  description:
    'Discover and book camping spots, fishing lakes, kayaking trails and outdoor activities. Browse venues, pick your exact spot on an interactive map, and confirm your reservation in minutes.',
  keywords: [
    'camping booking',
    'fishing spot reservation',
    'outdoor activities',
    'kayaking',
    'nature booking platform',
    'camping near me',
    'fishing lake booking',
    'outdoor spot reservation',
    'ontooff',
  ],
  authors: [{ name: 'ontooff', url: APP_URL }],
  creator: 'ontooff',
  publisher: 'ontooff',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: APP_URL,
    siteName: 'ontooff',
    title: 'ontooff – Book Outdoor Nature Activities',
    description:
      'Find and book camping spots, fishing lakes and outdoor activities. Browse, pick your exact spot on a map, and confirm your reservation instantly.',
    images: [
      {
        url: '/assets/images/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'ontooff – Book Outdoor Nature Activities',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@ontooff',
    title: 'ontooff – Book Outdoor Nature Activities',
    description:
      'Find and book camping spots, fishing lakes and outdoor activities.',
    images: ['/assets/images/og-image.jpg'],
  },
  alternates: {
    canonical: APP_URL,
  },
  icons: {
    icon: '/assets/images/logo.svg',
    shortcut: '/assets/images/logo.svg',
    apple: '/assets/images/logo.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>{children}</Providers>
        <I18nLocaleSync />
      </body>
    </html>
  );
}
