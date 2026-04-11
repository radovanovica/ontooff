import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ── GET /api/reviews/check ────────────────────────────────────────────────────
// Non-destructive eligibility check — no review created.
// Query params: editToken OR (registrationNumber + email) + placeId
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const editToken = searchParams.get('editToken');
  const registrationNumber = searchParams.get('registrationNumber');
  const email = searchParams.get('email');
  const placeId = searchParams.get('placeId');

  if (!placeId) {
    return NextResponse.json({ success: false, error: 'placeId is required' }, { status: 400 });
  }

  if (!editToken && !(registrationNumber && email)) {
    return NextResponse.json(
      { success: false, error: 'Provide editToken or registrationNumber + email' },
      { status: 400 },
    );
  }

  let registration;
  if (editToken) {
    registration = await prisma.registration.findFirst({
      where: { editToken, activityLocation: { placeId } },
      select: { id: true, status: true, firstName: true, lastName: true, email: true, activityLocationId: true },
    });
  } else {
    registration = await prisma.registration.findFirst({
      where: {
        registrationNumber: registrationNumber!,
        email: { equals: email!, mode: 'insensitive' },
        activityLocation: { placeId },
      },
      select: { id: true, status: true, firstName: true, lastName: true, email: true, activityLocationId: true },
    });
  }

  if (!registration) {
    return NextResponse.json({ eligible: false, alreadyReviewed: false, notFound: true }, { status: 200 });
  }

  if (!['CONFIRMED', 'COMPLETED'].includes(registration.status)) {
    return NextResponse.json({ eligible: false, alreadyReviewed: false, notEligible: true }, { status: 200 });
  }

  const existing = await prisma.review.findUnique({ where: { registrationId: registration.id } });

  return NextResponse.json({
    eligible: !existing,
    alreadyReviewed: !!existing,
    guestName: `${registration.firstName} ${registration.lastName}`,
    activityLocationId: registration.activityLocationId,
  });
}
