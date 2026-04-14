import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.ontooff.app';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  let place: {
    name: string;
    description: string | null;
    city: string | null;
    country: string | null;
    coverUrl: string | null;
  } | null = null;

  try {
    place = await prisma.place.findUnique({
      where: { slug, isActive: true },
      select: {
        name: true,
        description: true,
        city: true,
        country: true,
        coverUrl: true,
      },
    });
  } catch {
    // DB unavailable — fall back to defaults
  }

  if (!place) {
    return {
      title: 'Place Not Found',
      robots: { index: false, follow: false },
    };
  }

  const locationStr = [place.city, place.country].filter(Boolean).join(', ');
  const title = locationStr ? `${place.name} – ${locationStr}` : place.name;
  const description =
    place.description?.slice(0, 155) ??
    `Book outdoor activities at ${place.name}${locationStr ? ` in ${locationStr}` : ''}. Check availability and reserve your spot on ontooff.`;
  const pageUrl = `${APP_URL}/places/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      type: 'website',
      url: pageUrl,
      title,
      description,
      images: place.coverUrl
        ? [{ url: place.coverUrl, width: 1200, height: 630, alt: place.name }]
        : [{ url: `${APP_URL}/assets/images/og-image.jpg`, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: place.coverUrl ? [place.coverUrl] : [`${APP_URL}/assets/images/og-image.jpg`],
    },
  };
}

export default function PlaceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
