import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendRegistrationConfirmation } from '@/lib/email';
import { formatGuestSummary } from '@/lib/pricing';

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
    include: {
      activityLocation: {
        include: {
          activityTypes: { include: { activityType: { select: { name: true } } } },
          place: { select: { name: true } },
        },
      },
      registrationSpots: { include: { spot: { select: { name: true, code: true } } } },
      paymentBreakdown: { orderBy: { sortOrder: 'asc' } },
      pricingRule: { select: { requiresPayment: true, currency: true } },
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

  // Notify guest of confirmation with the full booking details email
  await sendRegistrationConfirmation(
    registration.email,
    {
      registrationNumber: registration.registrationNumber,
      firstName: registration.firstName,
      locationName: registration.activityLocation.name,
      activityName: registration.activityLocation.activityTypes.map((a) => a.activityType.name).join(', '),
      placeName: registration.activityLocation.place.name,
      startDate: registration.startDate.toLocaleDateString('en-GB'),
      endDate: registration.endDate.toLocaleDateString('en-GB'),
      numberOfDays: registration.numberOfDays,
      spotNames: registration.registrationSpots.map((rs) =>
        rs.spot.code ? `${rs.spot.name} (${rs.spot.code})` : rs.spot.name
      ),
      guestSummary: formatGuestSummary(registration.guestCounts as Record<string, number>),
      totalAmount: registration.totalAmount != null ? Number(registration.totalAmount) : undefined,
      currency: registration.pricingRule?.currency ?? 'RSD',
      requiresPayment: registration.pricingRule?.requiresPayment ?? false,
      paymentBreakdown: registration.paymentBreakdown.map((item) => ({
        label: item.label,
        totalPrice: Number(item.totalPrice),
      })),
      editToken: registration.editToken,
      status: 'CONFIRMED',
    }
  ).catch(console.error);

  // Redirect owner to the booking detail page
  return NextResponse.redirect(`${APP_URL}/owner/bookings/${id}?confirmed=1`);
}
