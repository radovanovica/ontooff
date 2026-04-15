import { prisma } from '@/lib/prisma';
import { SpotStatus } from '@/types';
import { RegistrationStatus } from '@prisma/client';

/**
 * Generate a unique human-readable registration number
 */
export async function generateRegistrationNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.registration.count({
    where: {
      registrationNumber: { startsWith: `REG-${year}-` },
    },
  });
  const seq = String(count + 1).padStart(6, '0');
  return `REG-${year}-${seq}`;
}

/**
 * Check if spots (with optional timeslots) are available for the given date range.
 * For spots with a timeslotId, the uniqueness constraint is per (spotId, timeslotId).
 * For spots with no timeslotId (null), the constraint is per spotId (old behaviour).
 */
export async function checkSpotAvailability(
  spotTimeslots: Array<{ spotId: string; timeslotId: string | null }>,
  startDate: Date,
  endDate: Date,
  excludeRegistrationId?: string
): Promise<{ available: boolean; conflicts: string[] }> {
  const conflicts: string[] = [];

  for (const { spotId, timeslotId } of spotTimeslots) {
    const existing = await prisma.registrationSpot.findFirst({
      where: {
        spotId,
        // null matches IS NULL, a string matches exactly — Prisma handles this correctly
        timeslotId: timeslotId ?? null,
        registration: {
          id: excludeRegistrationId ? { not: excludeRegistrationId } : undefined,
          status: { notIn: [RegistrationStatus.CANCELLED] },
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
      },
    });
    if (existing) conflicts.push(spotId);
  }

  return { available: conflicts.length === 0, conflicts };
}

/**
 * Get available spots for a location and date range.
 * Returns each spot with its timeslots and per-timeslot availability.
 */
export async function getAvailableSpots(
  activityLocationId: string,
  startDate: Date,
  endDate: Date,
  excludeRegistrationId?: string,
  activityTypeId?: string | null
) {
  const allSpots = await prisma.spot.findMany({
    where: {
      activityLocationId,
      status: SpotStatus.AVAILABLE,
      ...(activityTypeId
        ? { OR: [{ activityTypeId }, { activityTypeId: null }] }
        : undefined),
    },
    include: {
      timeslots: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
    },
    orderBy: { sortOrder: 'asc' },
  });

  const baseRegFilter = {
    id: excludeRegistrationId ? { not: excludeRegistrationId } : undefined,
    status: { notIn: [RegistrationStatus.CANCELLED] },
    startDate: { lte: endDate },
    endDate: { gte: startDate },
  };

  // Spots WITHOUT timeslots — check by spotId only (null timeslotId)
  const noTimeslotSpotIds = allSpots
    .filter((s) => s.timeslots.length === 0)
    .map((s) => s.id);

  const bookedNoTimeslotIds = noTimeslotSpotIds.length > 0
    ? await prisma.registrationSpot.findMany({
        where: {
          spotId: { in: noTimeslotSpotIds },
          timeslotId: null,
          registration: baseRegFilter,
        },
        select: { spotId: true },
      })
    : [];
  const bookedNoTimeslot = new Set(bookedNoTimeslotIds.map((b) => b.spotId));

  // Spots WITH timeslots — check per (spotId, timeslotId)
  const allTimeslotIds = allSpots.flatMap((s) => s.timeslots.map((t) => t.id));
  const bookedTimeslotRows = allTimeslotIds.length > 0
    ? await prisma.registrationSpot.findMany({
        where: {
          timeslotId: { in: allTimeslotIds },
          registration: baseRegFilter,
        },
        select: { spotId: true, timeslotId: true },
      })
    : [];

  // Build map: spotId → Set<bookedTimeslotId>
  const bookedBySpot = new Map<string, Set<string>>();
  for (const row of bookedTimeslotRows) {
    if (!row.timeslotId) continue;
    if (!bookedBySpot.has(row.spotId)) bookedBySpot.set(row.spotId, new Set());
    bookedBySpot.get(row.spotId)!.add(row.timeslotId);
  }

  return allSpots.map((spot) => {
    if (spot.timeslots.length === 0) {
      return { ...spot, isAvailable: !bookedNoTimeslot.has(spot.id), timeslots: [] };
    }
    const bookedTimeslotIds = bookedBySpot.get(spot.id) ?? new Set<string>();
    const timeslotsWithAvailability = spot.timeslots.map((t) => ({
      ...t,
      isAvailable: !bookedTimeslotIds.has(t.id),
    }));
    return {
      ...spot,
      isAvailable: timeslotsWithAvailability.some((t) => t.isAvailable),
      timeslots: timeslotsWithAvailability,
    };
  });
}

/**
 * Validate embed token and return its data
 */
export async function validateEmbedToken(token: string) {
  const embedToken = await prisma.embedToken.findUnique({
    where: { token },
    include: {
      place: { select: { id: true, name: true, isActive: true, logoUrl: true, slug: true } },
      activityLocation: {
        select: {
          id: true,
          name: true,
          isActive: true,
          activityTypes: { include: { activityType: { select: { id: true, name: true } } } },
        },
      },
    },
  });

  if (!embedToken || !embedToken.isActive) return null;
  if (!embedToken.place.isActive) return null;
  if (embedToken.expiresAt && embedToken.expiresAt < new Date()) return null;

  // Update usage stats
  await prisma.embedToken.update({
    where: { id: embedToken.id },
    data: { lastUsedAt: new Date(), useCount: { increment: 1 } },
  });

  return embedToken;
}

/**
 * Slugify a string
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
