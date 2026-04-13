import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Local types for the search result shape
interface SearchLocation {
  id: string;
  name: string;
  maxCapacity: number | null;
  requiresSpot: boolean;
  latitude: number | null;
  longitude: number | null;
  _count: { spots: number };
  available?: boolean;
  capacity?: number;
  bookedSpots?: number;
}
interface SearchActivityType {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  tags: { tag: { id: string; name: string; slug: string; icon: string | null; color: string | null } }[];
  activityLocations: SearchLocation[];
}
interface SearchPlaceRaw {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  country: string | null;
  description: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  activityTypes: SearchActivityType[];
  embedTokens: { token: string }[];
  _count: { activityLocations: number };
}

/**
 * GET /api/search
 * Query params:
 *   tags   - comma-separated tag slugs
 *   from   - YYYY-MM-DD
 *   to     - YYYY-MM-DD
 *   page   - number (default 1)
 *   pageSize - number (default 12)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tagsParam = searchParams.get('tags') ?? '';
  const from = searchParams.get('from') ?? '';
  const to = searchParams.get('to') ?? '';
  const location = searchParams.get('location') ?? '';
  const page = Number(searchParams.get('page') ?? 1);
  const pageSize = Number(searchParams.get('pageSize') ?? 12);

  const tagSlugs = tagsParam ? tagsParam.split(',').filter(Boolean) : [];

  // Build activityType filter if tags provided
  const activityTypeFilter = tagSlugs.length
    ? {
        activityTypes: {
          some: {
            isActive: true,
            tags: {
              some: {
                tag: {
                  slug: { in: tagSlugs },
                },
              },
            },
          },
        },
      }
    : {};

  // Build location filter (city OR country)
  const locationFilter = location
    ? {
        OR: [
          { city: { contains: location, mode: 'insensitive' as const } },
          { country: { contains: location, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const where = {
    isActive: true,
    ...activityTypeFilter,
    ...locationFilter,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const places: SearchPlaceRaw[] = (await prisma.place.findMany({
    where,
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: { createdAt: 'desc' },
    include: {
      owner: { select: { name: true } },
      activityTypes: {
        where: { isActive: true },
        include: {
          tags: {
            include: { tag: true },
          },
          activityLocations: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              maxCapacity: true,
              requiresSpot: true,
              latitude: true,
              longitude: true,
              _count: { select: { spots: true } },
            },
          },
        },
      },
      embedTokens: {
        where: { isActive: true },
        select: { token: true },
        take: 1,
      },
      _count: {
        select: {
          activityLocations: true,
        },
      },
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  })) as any;
  const total = await prisma.place.count({ where });

  // Fetch average ratings for all places in one query
  const placeIds = places.map((p: SearchPlaceRaw) => p.id);
  const ratingsRaw = await prisma.review.groupBy({
    by: ['placeId'],
    where: { placeId: { in: placeIds }, isApproved: true, isRejected: false },
    _avg: { rating: true },
    _count: { rating: true },
  });
  type RatingEntry = { avg: number | null; count: number };
  type GroupByResult = { placeId: string; _avg: { rating: number | null }; _count: { rating: number } };
  const ratingMap = new Map<string, RatingEntry>(
    (ratingsRaw as GroupByResult[]).map((r) => [r.placeId, { avg: r._avg.rating ?? null, count: r._count.rating }])
  );

  // If dates provided, filter out locations that are fully booked
  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;

  const results = await Promise.all(
    places.map(async (place) => {
      const rating = ratingMap.get(place.id);
      const base = {
        ...place,
        averageRating: rating?.avg ?? null,
        reviewCount: rating?.count ?? 0,
      };
      if (!fromDate || !toDate) {
        return { ...base, availableLocations: place.activityTypes.flatMap((at) => at.activityLocations) };
      }

      // For each activity location check available spots
      const activityLocationsWithAvailability = await Promise.all(
        place.activityTypes.flatMap((at) =>
          at.activityLocations.map(async (loc) => {
            const bookedSpots = await prisma.registrationSpot.count({
              where: {
                registration: {
                  activityLocationId: loc.id,
                  status: { notIn: ['CANCELLED'] },
                  startDate: { lte: toDate },
                  endDate: { gte: fromDate },
                },
              },
            });
            const capacity = loc.maxCapacity ?? loc._count.spots;
            const available = capacity > bookedSpots;
            return { ...loc, available, capacity, bookedSpots };
          })
        )
      );

      const availableLocations = activityLocationsWithAvailability.filter((l) => l.available);
      return { ...base, availableLocations };
    })
  );

  // Filter out places with no available locations when dates are given
  const filtered = fromDate ? results.filter((p) => (p.availableLocations?.length ?? 0) > 0) : results;

  // ── Free / community locations ──────────────────────────────────────────────
  const freeWhere: Record<string, unknown> = { isActive: true };
  if (tagSlugs.length) {
    freeWhere.tags = { some: { tag: { slug: { in: tagSlugs } } } };
  }
  if (location) {
    freeWhere.OR = [
      { city: { contains: location, mode: 'insensitive' } },
      { country: { contains: location, mode: 'insensitive' } },
    ];
  }
  const freeLocations = await prisma.freeLocation.findMany({
    where: freeWhere,
    include: { tags: { include: { tag: true } } },
    orderBy: { createdAt: 'desc' },
  });

  // Shape free locations into the same search result format
  const freeItems = freeLocations.map((loc) => ({
    id: loc.id,
    name: loc.name,
    slug: loc.slug,
    city: loc.city,
    country: loc.country,
    description: loc.description,
    coverUrl: loc.coverUrl,
    logoUrl: loc.logoUrl,
    phone: loc.phone,
    email: loc.email,
    website: loc.website,
    averageRating: null,
    reviewCount: 0,
    isFree: true,
    activityTypes: [] as {
      id: string;
      name: string;
      icon: string | null;
      color: string | null;
      tags: { tag: { id: string; name: string; slug: string; icon: string | null; color: string | null } }[];
      activityLocations: {
        id: string;
        name: string;
        maxCapacity: null;
        latitude: number | null;
        longitude: number | null;
        available: true;
      }[];
    }[],
    tags: loc.tags,
    availableLocations: [{
      id: loc.id,
      name: loc.name,
      latitude: loc.latitude,
      longitude: loc.longitude,
    }],
  }));

  const allItems = [...filtered, ...freeItems];

  return NextResponse.json({
    success: true,
    data: {
      items: allItems,
      total: (fromDate ? filtered.length : total) + freeItems.length,
      page,
      pageSize,
      totalPages: Math.ceil(((fromDate ? filtered.length : total) + freeItems.length) / pageSize),
      filters: { tags: tagSlugs, from, to, location },
    },
  });
}
