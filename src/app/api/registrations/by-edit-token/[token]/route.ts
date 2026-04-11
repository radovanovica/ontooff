import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ── GET /api/registrations/by-edit-token/[token] ─────────────────────────────
// Public — resolves the placeId (and basic info) for a given editToken.
// Used by the standalone /review/[editToken] page to know which placeId to pass
// to the review check/submit endpoints.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const registration = await prisma.registration.findFirst({
    where: { editToken: token },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      activityLocationId: true,
      activityLocation: {
        select: {
          placeId: true,
          place: { select: { name: true } },
        },
      },
    },
  });

  if (!registration) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: {
      placeId: registration.activityLocation?.placeId,
      placeName: registration.activityLocation?.place?.name,
      activityLocationId: registration.activityLocationId,
      guestName: `${registration.firstName} ${registration.lastName}`,
    },
  });
}
