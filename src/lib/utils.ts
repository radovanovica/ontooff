import { prisma } from '@/lib/prisma';
import { SpotStatus } from '@/types';

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
 * Check if spots are available for the given date range
 */
export async function checkSpotAvailability(
  spotIds: string[],
  startDate: Date,
  endDate: Date,
  excludeRegistrationId?: string
): Promise<{ available: boolean; conflicts: string[] }> {
  const conflicts = await prisma.registrationSpot.findMany({
    where: {
      spotId: { in: spotIds },
      registration: {
        id: excludeRegistrationId ? { not: excludeRegistrationId } : undefined,
        status: { notIn: ['CANCELLED'] },
        OR: [
          { startDate: { lte: endDate }, endDate: { gte: startDate } },
        ],
      },
    },
    select: { spotId: true },
  });

  const conflictIds = [...new Set(conflicts.map((c: { spotId: string }) => c.spotId))];
  return { available: conflictIds.length === 0, conflicts: conflictIds as string[] };
}

/**
 * Get available spots for a location and date range
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
      // If activityTypeId provided, show only spots matching that type OR spots with no type assigned
      ...(activityTypeId
        ? { OR: [{ activityTypeId }, { activityTypeId: null }] }
        : undefined),
    },
  });

  const bookedSpotIds = await prisma.registrationSpot.findMany({
    where: {
      spotId: { in: allSpots.map((s: { id: string }) => s.id) },
      registration: {
        id: excludeRegistrationId ? { not: excludeRegistrationId } : undefined,
        status: { notIn: ['CANCELLED'] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    },
    select: { spotId: true },
  });

  const bookedIds = new Set(bookedSpotIds.map((b: { spotId: string }) => b.spotId));

  return allSpots.map((spot: { id: string; [key: string]: unknown }) => ({
    ...spot,
    isAvailable: !bookedIds.has(spot.id),
  }));
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
