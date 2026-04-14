import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Search Activities & Locations',
  description:
    'Search and filter outdoor camping spots, fishing lakes, kayaking trails and free community locations. Use the map to find activities near you.',
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Search Outdoor Activities | ontooff',
    description:
      'Browse camping spots, fishing lakes, kayaking and outdoor activities. Filter by date, location and activity type.',
  },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
