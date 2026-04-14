import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/* eslint-disable @typescript-eslint/no-explicit-any */
type LocationWithPricing = Record<string, any> & { activityTypeId: string; pricingRules: any[] };

// Public endpoint: returns all active locations + pricing for a place
// Used by the public place detail page to render the booking stepper directly
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Accept either place id or slug
  const place = await prisma.place.findFirst({
    where: {
      isActive: true,
      OR: [{ id }, { slug: id }],
    },
    select: { id: true, name: true, slug: true, timezone: true },
  });

  if (!place) {
    return NextResponse.json({ success: false, error: 'Place not found' }, { status: 404 });
  }

  const rawLocations = await prisma.activityLocation.findMany({
    where: { placeId: place.id, isActive: true },
    include: {
      activityType: { select: { id: true, name: true, icon: true, color: true } },
      spots: { where: { status: 'AVAILABLE' }, orderBy: { sortOrder: 'asc' } },
      _count: { select: { spots: true } },
    },
    orderBy: { sortOrder: 'asc' },
  });
  const locations = rawLocations as LocationWithPricing[];

  const activityTypeIds = [...new Set(locations.map((loc) => loc.activityTypeId))];
  const pricingRules = await prisma.pricingRule.findMany({
    where: { isActive: true, activityTypeId: { in: activityTypeIds } },
    include: { pricingTiers: { orderBy: { sortOrder: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  });

  const pricingByType = new Map<string, typeof pricingRules>();
  for (const rule of pricingRules) {
    if (!rule.activityTypeId) continue;
    const existing = pricingByType.get(rule.activityTypeId) ?? [];
    existing.push(rule);
    pricingByType.set(rule.activityTypeId, existing);
  }

  const enrichedLocations: LocationWithPricing[] = locations.map((loc) => ({
    ...loc,
    pricingRules: pricingByType.get(loc.activityTypeId) ?? [],
  }));

  return NextResponse.json({
    success: true,
    data: {
      place,
      locations: enrichedLocations,
    },
  });
}
