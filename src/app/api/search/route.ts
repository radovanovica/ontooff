import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

  const where = {
    isActive: true,
    ...activityTypeFilter,
  };

  const [places, total] = await Promise.all([
    prisma.place.findMany({
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
                // Check availability if dates provided
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
    }),
    prisma.place.count({ where }),
  ]);

  // If dates provided, filter out locations that are fully booked
  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;

  const results = await Promise.all(
    places.map(async (place) => {
      if (!fromDate || !toDate) {
        return { ...place, availableLocations: place.activityTypes.flatMap((at) => at.activityLocations) };
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
      return { ...place, availableLocations };
    })
  );

  // Filter out places with no available locations when dates are given
  const filtered = fromDate ? results.filter((p) => (p.availableLocations?.length ?? 0) > 0) : results;

  return NextResponse.json({
    success: true,
    data: {
      items: filtered,
      total: fromDate ? filtered.length : total,
      page,
      pageSize,
      totalPages: Math.ceil((fromDate ? filtered.length : total) / pageSize),
      filters: { tags: tagSlugs, from, to },
    },
  });
}
