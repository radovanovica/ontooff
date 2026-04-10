import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateEmbedToken } from '@/lib/utils';
import { getAvailableSpots } from '@/lib/utils';

// Public endpoint: validate token + return location/spots data for embedding
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const embedToken = await validateEmbedToken(token);

  if (!embedToken) {
    return NextResponse.json({ success: false, error: 'Invalid or expired embed token' }, { status: 404 });
  }

  const { searchParams } = req.nextUrl;
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  // Fetch location data
  const locationId = embedToken.activityLocationId;

  if (!locationId) {
    // Token is for entire place — return all active locations
    const locations = await prisma.activityLocation.findMany({
      where: { placeId: embedToken.placeId, isActive: true },
      include: {
        activityType: { select: { id: true, name: true, icon: true, color: true } },
        _count: { select: { spots: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });

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

    const enrichedLocations = locations.map((loc) => ({
      ...loc,
      pricingRules: pricingByType.get(loc.activityTypeId) ?? [],
    }));

    return NextResponse.json({
      success: true,
      data: {
        place: embedToken.place,
        locations: enrichedLocations,
        embedTokenId: embedToken.id,
      },
    });
  }

  // Token is for specific location
  const location = await prisma.activityLocation.findUnique({
    where: { id: locationId, isActive: true },
    include: {
      activityType: true,
      place: { select: { id: true, name: true, slug: true, timezone: true } },
      spots: { where: { status: 'AVAILABLE' }, orderBy: { sortOrder: 'asc' } },
    },
  });

  if (!location) {
    return NextResponse.json({ success: false, error: 'Location not found' }, { status: 404 });
  }

  const pricingRules = await prisma.pricingRule.findMany({
    where: { isActive: true, activityTypeId: location.activityTypeId },
    include: { pricingTiers: { orderBy: { sortOrder: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  });

  // Enrich spots with availability if dates provided
  let spots = location.spots;
  if (startDate && endDate) {
    const available = await getAvailableSpots(locationId, new Date(startDate), new Date(endDate));
    const availMap = new Map(available.map((s: { id: string; isAvailable: boolean }) => [s.id, s.isAvailable]));
    spots = location.spots.map((spot: { id: string; [key: string]: unknown }) => ({ ...spot, isAvailable: availMap.get(spot.id) ?? true }));
  }

  return NextResponse.json({
    success: true,
    data: {
      place: embedToken.place,
      location: { ...location, spots, pricingRules },
      embedTokenId: embedToken.id,
    },
  });
}
