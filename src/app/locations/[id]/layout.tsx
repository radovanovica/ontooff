import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.ontooff.app';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  let loc: {
    name: string;
    description: string | null;
    city: string | null;
    country: string | null;
    coverUrl: string | null;
    slug: string;
  } | null = null;

  try {
    // Support both numeric id and slug lookup
    loc = await prisma.freeLocation.findFirst({
      where: { OR: [{ id }, { slug: id }], isActive: true },
      select: {
        name: true,
        description: true,
        city: true,
        country: true,
        coverUrl: true,
        slug: true,
      },
    });
  } catch {
    // DB unavailable — fall back to defaults
  }

  if (!loc) {
    return {
      title: 'Location Not Found',
      robots: { index: false, follow: false },
    };
  }

  const locationStr = [loc.city, loc.country].filter(Boolean).join(', ');
  const title = locationStr ? `${loc.name} – ${locationStr}` : loc.name;
  const description =
    loc.description?.slice(0, 155) ??
    `Explore ${loc.name}${locationStr ? ` in ${locationStr}` : ''} – a free community outdoor location listed on ontooff.`;
  const pageUrl = `${APP_URL}/locations/${loc.slug}`;

  return {
    title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      type: 'website',
      url: pageUrl,
      title,
      description,
      images: loc.coverUrl
        ? [{ url: loc.coverUrl, width: 1200, height: 630, alt: loc.name }]
        : [{ url: `${APP_URL}/assets/images/og-image.jpg`, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: loc.coverUrl ? [loc.coverUrl] : [`${APP_URL}/assets/images/og-image.jpg`],
    },
  };
}

export default function LocationLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
