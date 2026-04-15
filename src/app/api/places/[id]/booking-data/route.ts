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
      activityTypes: { include: { activityType: { select: { id: true, name: true, icon: true, color: true } } } },
      spots: { where: { status: 'AVAILABLE' }, orderBy: { sortOrder: 'asc' } },
      _count: { select: { spots: true } },
    },
    orderBy: { sortOrder: 'asc' },
  });
  const locations = (rawLocations as unknown) as LocationWithPricing[];

  // Collect all activity type IDs for pricing lookup
  const activityTypeIds = [
    ...new Set(
      locations.flatMap((loc) =>
        (loc.activityTypes ?? []).map((a: Record<string, any>) => a.activityTypeId as string)
      )
    ),
  ];
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

  const enrichedLocations: LocationWithPricing[] = locations.map((loc) => {
    // Collect pricing rules for all activity types assigned to this location
    const locActivityTypeIds = (loc.activityTypes ?? []).map((a: Record<string, any>) => a.activityTypeId as string);
    const locPricingRules = locActivityTypeIds.flatMap((atId: string) => pricingByType.get(atId) ?? []);
    return { ...loc, pricingRules: locPricingRules };
  });

  return NextResponse.json({
    success: true,
    data: {
      place,
      locations: enrichedLocations,
    },
  });
}
