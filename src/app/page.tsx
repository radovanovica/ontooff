import type { Metadata } from 'next';
import HomePage from './_HomePage';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.ontooff.app';

export const metadata: Metadata = {
  title: 'ontooff – Book Camping, Fishing & Outdoor Activities',
  description:
    'Find and book camping spots, fishing lakes and kayaking trails. Browse venues, pick your exact spot on an interactive map, and confirm your booking in minutes.',
  alternates: {
    canonical: APP_URL,
  },
  openGraph: {
    type: 'website',
    url: APP_URL,
    title: 'ontooff – Book Camping, Fishing & Outdoor Activities',
    description:
      'Find and book camping spots, fishing lakes and outdoor activities near you. Browse, pick your spot on a map, and book in minutes.',
    images: [
      {
        url: `${APP_URL}/assets/images/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: 'ontooff – Outdoor Nature Activities',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ontooff – Book Camping, Fishing & Outdoor Activities',
    description: 'Find and book camping, fishing, kayaking and outdoor activities.',
    images: [`${APP_URL}/assets/images/og-image.jpg`],
  },
};

// JSON-LD structured data for the home page
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${APP_URL}/#website`,
      url: APP_URL,
      name: 'ontooff',
      description: 'Book outdoor nature activities – camping, fishing, kayaking and more.',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${APP_URL}/search?location={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'Organization',
      '@id': `${APP_URL}/#organization`,
      name: 'ontooff',
      url: APP_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${APP_URL}/assets/images/logo.svg`,
      },
      sameAs: [
        'https://x.com/ontooff',
        'https://twitter.com/ontooff',
      ],
    },
    {
      '@type': 'LocalBusiness',
      '@id': `${APP_URL}/#localbusiness`,
      name: 'ontooff',
      description: 'Online booking platform for outdoor nature activities – camping, fishing, kayaking and more.',
      url: APP_URL,
      logo: `${APP_URL}/assets/images/logo.svg`,
      image: `${APP_URL}/assets/images/og-image.jpg`,
      priceRange: '€',
      openingHours: 'Mo-Su 00:00-23:59',
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        url: APP_URL,
      },
    },
  ],
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomePage />
    </>
  );
}
