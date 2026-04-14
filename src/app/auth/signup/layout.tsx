import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Free Account',
  description: 'Join ontooff for free and start booking camping spots, fishing lakes and outdoor activities today.',
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Create Free Account | ontooff',
    description: 'Sign up for free and book outdoor activities, camping and fishing spots.',
  },
};

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
