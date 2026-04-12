import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendRegistrationStatusUpdate } from '@/lib/email';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

/**
 * GET /api/registrations/[id]/approve?token=[editToken]
 *
 * One-click approve link sent in owner notification emails.
 * Validates the editToken belongs to this registration, sets status to CONFIRMED,
 * notifies the guest, then redirects the owner to the booking detail page.
 *
 * No session required — the editToken acts as the secret.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = req.nextUrl.searchParams.get('token');

  if (!token) {
    return new NextResponse('Missing token', { status: 400 });
  }

  const registration = await prisma.registration.findUnique({
    where: { id },
    select: {
      id: true,
      editToken: true,
      status: true,
      email: true,
      firstName: true,
      registrationNumber: true,
    },
  });

  if (!registration || registration.editToken !== token) {
    return new NextResponse('Invalid or expired link', { status: 403 });
  }

  if (registration.status === 'CONFIRMED') {
    // Already confirmed — just redirect to dashboard
    return NextResponse.redirect(`${APP_URL}/owner/bookings/${id}?alreadyConfirmed=1`);
  }

  await prisma.registration.update({
    where: { id },
    data: { status: 'CONFIRMED' },
  });

  // Notify guest of confirmation
  await sendRegistrationStatusUpdate(
    registration.email,
    registration.firstName,
    registration.registrationNumber,
    'CONFIRMED',
    registration.editToken
  ).catch(console.error);

  // Redirect owner to the booking detail page
  return NextResponse.redirect(`${APP_URL}/owner/bookings/${id}?confirmed=1`);
}
