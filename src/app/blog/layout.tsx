import type { Metadata } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.ontooff.app';

export const metadata: Metadata = {
  title: 'Outdoor Activity Blog – Tips, Guides & Inspiration',
  description:
    'Read expert guides, tips and stories about camping, fishing, kayaking and outdoor activities. Discover new venues and get inspired for your next adventure.',
  alternates: { canonical: `${APP_URL}/blog` },
  openGraph: {
    type: 'website',
    url: `${APP_URL}/blog`,
    title: 'Outdoor Activity Blog | ontooff',
    description:
      'Expert guides, tips and stories about camping, fishing, kayaking and outdoor adventures.',
    images: [{ url: `${APP_URL}/assets/images/og-image.jpg`, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Outdoor Activity Blog | ontooff',
    description:
      'Expert guides, tips and stories about camping, fishing, kayaking and outdoor adventures.',
    images: [`${APP_URL}/assets/images/og-image.jpg`],
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
