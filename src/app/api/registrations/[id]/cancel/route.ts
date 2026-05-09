import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendRegistrationStatusUpdate } from '@/lib/email';

/**
 * POST /api/registrations/[id]/cancel
 *
 * Guest-initiated cancellation via editToken. Only allowed when the reservation
 * start date is still in the future. The editToken is passed via the
 * x-edit-token header or `token` query param.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const editToken =
    req.headers.get('x-edit-token') ??
    req.nextUrl.searchParams.get('token') ??
    undefined;

  if (!editToken) {
    return NextResponse.json({ success: false, error: 'Missing token' }, { status: 400 });
  }

  const registration = await prisma.registration.findUnique({
    where: { id },
    select: {
      id: true,
      editToken: true,
      status: true,
      startDate: true,
      email: true,
      firstName: true,
      registrationNumber: true,
    },
  });

  if (!registration || registration.editToken !== editToken) {
    return NextResponse.json({ success: false, error: 'Invalid or expired token' }, { status: 403 });
  }

  if (registration.status === 'CANCELLED') {
    return NextResponse.json({ success: false, error: 'Reservation is already cancelled' }, { status: 400 });
  }

  // Guest cancellation is only allowed before the reservation start date
  if (new Date(registration.startDate) <= new Date()) {
    return NextResponse.json(
      { success: false, error: 'Cancellation is only possible before the reservation start date' },
      { status: 400 }
    );
  }

  await prisma.registration.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });

  await sendRegistrationStatusUpdate(
    registration.email,
    registration.firstName,
    registration.registrationNumber,
    'CANCELLED',
    registration.editToken
  ).catch(console.error);

  return NextResponse.json({ success: true });
}
