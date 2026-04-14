import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.ontooff.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Static public pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: APP_URL,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${APP_URL}/search`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${APP_URL}/auth/signin`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${APP_URL}/auth/signup`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${APP_URL}/auth/register-org`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  // Dynamic: active places
  let placeRoutes: MetadataRoute.Sitemap = [];
  try {
    const places = await prisma.place.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    });
    placeRoutes = places.map((p: { slug: string; updatedAt: Date }) => ({
      url: `${APP_URL}/places/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
  } catch {
    // DB unavailable at build time — skip
  }

  // Dynamic: active free/community locations
  let freeRoutes: MetadataRoute.Sitemap = [];
  try {
    const freeLocations = await prisma.freeLocation.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    });
    freeRoutes = freeLocations.map((l: { slug: string | null; updatedAt: Date }) => ({
      url: `${APP_URL}/locations/${l.slug}`,
      lastModified: l.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
  } catch {
    // DB unavailable at build time — skip
  }

  return [...staticRoutes, ...placeRoutes, ...freeRoutes];
}
