import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Register Your Organization',
  description: 'List your outdoor venue on ontooff. Register your camping ground, fishing lake, kayaking center or activity venue and start accepting bookings.',
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Register Your Organization | ontooff',
    description: 'List your outdoor venue and start accepting bookings through ontooff.',
  },
};

export default function RegisterOrgLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
