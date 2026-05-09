import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/places/featured
 *
 * Public endpoint. Returns all active PREMIUM or RECOMMENDED places,
 * ordered PREMIUM first, then RECOMMENDED, then by name.
 */
export async function GET() {
  const places = await prisma.place.findMany({
    where: {
      isActive: true,
      status: { in: ['PREMIUM', 'RECOMMENDED'] },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      city: true,
      country: true,
      coverUrl: true,
      logoUrl: true,
      status: true,
      activityTypes: {
        where: { isActive: true },
        select: { name: true, icon: true, color: true },
        orderBy: { sortOrder: 'asc' },
        take: 3,
      },
    },
    orderBy: [
      // PREMIUM before RECOMMENDED (lexicographic: PREMIUM < RECOMMENDED)
      { status: 'asc' },
      { name: 'asc' },
    ],
  });

  return NextResponse.json({ success: true, data: places });
}
