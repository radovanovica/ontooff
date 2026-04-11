import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

const createSchema = z.object({
  // One of these two auth methods must be provided
  editToken: z.string().optional(),           // from confirmation email link
  registrationNumber: z.string().optional(),  // typed manually
  email: z.string().email().optional(),       // must match registration email

  placeId: z.string(),
  activityLocationId: z.string().optional(),

  rating: z.number().int().min(1).max(5),
  title: z.string().max(120).optional(),
  body: z.string().min(10).max(2000),
});

// ── POST /api/reviews ─────────────────────────────────────────────────────────
// Public — verified by editToken OR (registrationNumber + email)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = createSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: 'Validation failed', details: result.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { editToken, registrationNumber, email, placeId, activityLocationId, rating, title, body: reviewBody } = result.data;

  if (!editToken && !(registrationNumber && email)) {
    return NextResponse.json(
      { success: false, error: 'Provide editToken or registrationNumber + email' },
      { status: 400 },
    );
  }

  // Find the registration
  let registration;
  if (editToken) {
    registration = await prisma.registration.findFirst({
      where: { editToken, activityLocation: { placeId } },
      include: { activityLocation: { select: { placeId: true, id: true } } },
    });
  } else {
    registration = await prisma.registration.findFirst({
      where: {
        registrationNumber: registrationNumber!,
        email: { equals: email!, mode: 'insensitive' },
        activityLocation: { placeId },
      },
      include: { activityLocation: { select: { placeId: true, id: true } } },
    });
  }

  if (!registration) {
    return NextResponse.json(
      { success: false, error: 'Reservation not found. Please check your booking number and email.' },
      { status: 404 },
    );
  }

  // Only allow reviews for confirmed/completed bookings
  if (!['CONFIRMED', 'COMPLETED'].includes(registration.status)) {
    return NextResponse.json(
      { success: false, error: 'Reviews can only be submitted for confirmed or completed bookings.' },
      { status: 403 },
    );
  }

  // Check if already reviewed
  const existing = await prisma.review.findUnique({ where: { registrationId: registration.id } });
  if (existing) {
    return NextResponse.json(
      { success: false, error: 'You have already submitted a review for this booking.' },
      { status: 409 },
    );
  }

  // Resolve placeId from the registration to be safe
  const resolvedPlaceId = registration.activityLocation?.placeId ?? placeId;
  const resolvedLocationId = activityLocationId ?? registration.activityLocationId ?? null;

  // Determine userId from session if available
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;

  const review = await prisma.review.create({
    data: {
      placeId: resolvedPlaceId,
      activityLocationId: resolvedLocationId,
      registrationId: registration.id,
      userId,
      guestName: `${registration.firstName} ${registration.lastName}`,
      guestEmail: registration.email,
      rating,
      title: title ?? null,
      body: reviewBody,
      isApproved: false,
      isRejected: false,
    },
  });

  return NextResponse.json({ success: true, data: review }, { status: 201 });
}

// ── GET /api/reviews ──────────────────────────────────────────────────────────
// Public — returns approved reviews, optional filter by placeId / locationId
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const placeId = searchParams.get('placeId');
  const locationId = searchParams.get('locationId');
  const page = Number(searchParams.get('page') ?? 1);
  const pageSize = Math.min(Number(searchParams.get('pageSize') ?? 20), 50);

  const where: Record<string, unknown> = { isApproved: true, isRejected: false };
  if (placeId) where.placeId = placeId;
  if (locationId) where.activityLocationId = locationId;

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        placeId: true,
        activityLocationId: true,
        guestName: true,
        rating: true,
        title: true,
        body: true,
        createdAt: true,
        activityLocation: { select: { id: true, name: true } },
      },
    }),
    prisma.review.count({ where }),
  ]);

  // Aggregate rating
  const agg = await prisma.review.aggregate({
    where,
    _avg: { rating: true },
    _count: { rating: true },
  });

  return NextResponse.json({
    success: true,
    data: reviews,
    meta: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      averageRating: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : null,
      totalRatings: agg._count.rating,
    },
  });
}
