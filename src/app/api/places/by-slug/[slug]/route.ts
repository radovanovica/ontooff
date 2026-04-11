import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const place = await prisma.place.findUnique({
    where: { slug, isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      city: true,
      country: true,
      address: true,
      phone: true,
      email: true,
      website: true,
      activityTypes: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          icon: true,
          color: true,
          tags: { include: { tag: true } },
          activityLocations: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              description: true,
              gallery: true,
              instructions: true,
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { sortOrder: 'asc' },
      },
      embedTokens: {
        where: { isActive: true },
        select: { token: true },
        take: 1,
      },
    },
  });

  if (!place) {
    return NextResponse.json({ success: false, error: 'Place not found' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: {
      ...place,
      embedToken: place.embedTokens[0]?.token ?? null,
      embedTokens: undefined,
    },
  });
}
