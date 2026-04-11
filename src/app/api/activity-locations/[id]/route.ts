import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@/types';
import { getAvailableSpots } from '@/lib/utils';

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  maxCapacity: z.number().int().positive().optional(),
  requiresSpot: z.boolean().optional(),
  mapWidth: z.number().int().positive().optional(),
  mapHeight: z.number().int().positive().optional(),
  sortOrder: z.number().optional(),
  svgMapData: z.string().optional(),
  mapImageUrl: z.string().optional(),
  isActive: z.boolean().optional(),
  gallery: z.string().optional(),       // JSON: string[] of base64 data-URIs
  instructions: z.string().optional(),  // How to find this location
});

async function getLocationWithAccess(id: string, userId: string, role: UserRole) {
  const location = await prisma.activityLocation.findUnique({
    where: { id },
    include: { place: { select: { ownerId: true } } },
  });
  if (!location) return null;
  if (role !== UserRole.SUPER_ADMIN && location.place.ownerId !== userId) return null;
  return location;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = req.nextUrl;
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  const location = await prisma.activityLocation.findUnique({
    where: { id },
    include: {
      activityType: true,
      place: { select: { id: true, name: true, slug: true, timezone: true } },
      spots: { orderBy: { sortOrder: 'asc' } },
    },
  });

  if (!location) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  const pricingRules = await prisma.pricingRule.findMany({
    where: { isActive: true, activityTypeId: location.activityTypeId },
    include: { pricingTiers: { orderBy: { sortOrder: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  });

  // If date range given, enrich spots with availability
  if (startDate && endDate && location.spots) {
    const availableSpots = await getAvailableSpots(id, new Date(startDate), new Date(endDate));
    const availabilityMap = new Map(availableSpots.map((s: { id: string; isAvailable: boolean }) => [s.id, s.isAvailable]));
    const enrichedSpots = location.spots.map((spot: { id: string; [key: string]: unknown }) => ({
      ...spot,
      isAvailable: availabilityMap.get(spot.id) ?? true,
    }));
    return NextResponse.json({ success: true, data: { ...location, spots: enrichedSpots, pricingRules } });
  }

  return NextResponse.json({ success: true, data: { ...location, pricingRules } });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const location = await getLocationWithAccess(id, session.user.id, session.user.role);
  if (!location) return NextResponse.json({ success: false, error: 'Not found or forbidden' }, { status: 404 });

  const body = await req.json();
  const result = updateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ success: false, error: 'Validation failed', details: result.error.flatten().fieldErrors }, { status: 422 });
  }

  const updated = await prisma.activityLocation.update({ where: { id }, data: result.data });
  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const location = await getLocationWithAccess(id, session.user.id, session.user.role);
  if (!location) return NextResponse.json({ success: false, error: 'Not found or forbidden' }, { status: 404 });

  await prisma.activityLocation.delete({ where: { id } });
  return NextResponse.json({ success: true, message: 'Location deleted' });
}
