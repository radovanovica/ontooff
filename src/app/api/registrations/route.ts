import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { UserRole, PaymentMethod, GuestCounts, AgeGroupType } from '@/types';
import { generateRegistrationNumber, checkSpotAvailability } from '@/lib/utils';
import { calculatePricing, formatGuestSummary, getTotalGuests } from '@/lib/pricing';
import { sendRegistrationConfirmation } from '@/lib/email';
import type { PricingTier } from '@prisma/client';

const guestCountsSchema = z.record(z.string(), z.number().int().nonnegative()).refine(
  (data) => Object.values(data).some((v) => v > 0),
  { message: 'At least one guest is required' }
);

const createSchema = z.object({
  activityLocationId: z.string(),
  spotIds: z.array(z.string()).optional().default([]),
  pricingRuleId: z.string().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  address: z.string().optional(),
  startDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  endDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  notes: z.string().optional(),
  guestCounts: guestCountsSchema,
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  embedTokenId: z.string().optional(),
  source: z.string().optional().default('web'),
  sendConfirmation: z.boolean().optional().default(true),
  initialStatus: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED']).optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const page = Number(searchParams.get('page') ?? 1);
  const pageSize = Number(searchParams.get('pageSize') ?? 20);
  const status = searchParams.get('status');
  const locationId = searchParams.get('activityLocationId');

  const where: Record<string, unknown> = {};

  if (session.user.role === UserRole.USER) {
    where.userId = session.user.id;
  } else if (session.user.role === UserRole.PLACE_OWNER) {
    // Owner sees registrations for their places
    const ownerPlaces = await prisma.place.findMany({
      where: { ownerId: session.user.id },
      select: { id: true },
    });
    const locationIds = await prisma.activityLocation.findMany({
      where: { placeId: { in: ownerPlaces.map((p) => p.id) } },
      select: { id: true },
    });
    where.activityLocationId = { in: locationIds.map((l) => l.id) };
  }

  const placeId = searchParams.get('placeId');
  if (status) where.status = status;
  if (locationId) where.activityLocationId = locationId;
  if (placeId) {
    // Filter by all locations belonging to this place
    const placeLocations = await prisma.activityLocation.findMany({
      where: { placeId },
      select: { id: true },
    });
    where.activityLocationId = { in: placeLocations.map((l: { id: string }) => l.id) };
  }

  const [registrations, total] = await Promise.all([
    prisma.registration.findMany({
      where,
      include: {
        activityLocation: {
          include: {
            activityType: { select: { id: true, name: true, icon: true } },
            place: { select: { id: true, name: true, slug: true } },
          },
        },
        registrationSpots: { include: { spot: { select: { id: true, name: true, code: true } } } },
        paymentBreakdown: { orderBy: { sortOrder: 'asc' } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.registration.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: { items: registrations, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const result = createSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: result.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const data = result.data;
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    if (endDate <= startDate) {
      return NextResponse.json({ success: false, error: 'End date must be after start date' }, { status: 422 });
    }

    const numberOfDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Check location exists
    const location = await prisma.activityLocation.findUnique({
      where: { id: data.activityLocationId, isActive: true },
      include: {
        activityType: true,
        place: { select: { name: true } },
      },
    });

    if (!location) {
      return NextResponse.json({ success: false, error: 'Activity location not found' }, { status: 404 });
    }

    const totalGuests = getTotalGuests(data.guestCounts as GuestCounts);

    // Check spot availability
    if (data.spotIds.length > 0) {
      const { available, conflicts } = await checkSpotAvailability(data.spotIds, startDate, endDate);
      if (!available) {
        return NextResponse.json(
          { success: false, error: 'One or more spots are not available for the selected dates', conflicts },
          { status: 409 }
        );
      }

      const selectedSpots = await prisma.spot.findMany({
        where: {
          id: { in: data.spotIds },
          activityLocationId: data.activityLocationId,
        },
        select: { id: true, maxPeople: true },
      });

      if (selectedSpots.length !== data.spotIds.length) {
        return NextResponse.json({ success: false, error: 'One or more selected spots are invalid' }, { status: 422 });
      }

      const selectedSpotsCapacity = selectedSpots.reduce((sum, spot) => sum + spot.maxPeople, 0);
      if (totalGuests > selectedSpotsCapacity) {
        return NextResponse.json(
          {
            success: false,
            error: `Selected spots can host up to ${selectedSpotsCapacity} guests, but ${totalGuests} were provided`,
          },
          { status: 422 }
        );
      }
    } else if (location.maxCapacity != null && totalGuests > location.maxCapacity) {
      return NextResponse.json(
        {
          success: false,
          error: `This location supports up to ${location.maxCapacity} guests, but ${totalGuests} were provided`,
        },
        { status: 422 }
      );
    }

    // Calculate pricing
    let pricingData: {
      totalAmount?: number;
      pricingRuleId?: string;
      paymentBreakdown?: Array<{
        label: string;
        ageGroup?: AgeGroupType;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
        sortOrder: number;
      }>;
    } = {};

    if (data.pricingRuleId) {
      const pricingRule = await prisma.pricingRule.findUnique({
        where: { id: data.pricingRuleId, isActive: true, activityTypeId: location.activityTypeId },
        include: { pricingTiers: true },
      });

      if (!pricingRule) {
        return NextResponse.json(
          { success: false, error: 'Selected pricing rule is not valid for this activity' },
          { status: 422 }
        );
      }

      if (pricingRule.minDays != null && numberOfDays < pricingRule.minDays) {
        return NextResponse.json(
          { success: false, error: `Minimum stay for this pricing rule is ${pricingRule.minDays} day(s)` },
          { status: 422 }
        );
      }

      if (pricingRule.maxDays != null && numberOfDays > pricingRule.maxDays) {
        return NextResponse.json(
          { success: false, error: `Maximum stay for this pricing rule is ${pricingRule.maxDays} day(s)` },
          { status: 422 }
        );
      }

      if (pricingRule.minPeople != null && totalGuests < pricingRule.minPeople) {
        return NextResponse.json(
          { success: false, error: `Minimum guests for this pricing rule is ${pricingRule.minPeople}` },
          { status: 422 }
        );
      }

      if (pricingRule.maxPeople != null && totalGuests > pricingRule.maxPeople) {
        return NextResponse.json(
          { success: false, error: `Maximum guests for this pricing rule is ${pricingRule.maxPeople}` },
          { status: 422 }
        );
      }

      if (pricingRule.requiresPayment) {
        if (!data.paymentMethod) {
          return NextResponse.json(
            { success: false, error: 'Payment method is required for this pricing rule' },
            { status: 422 }
          );
        }
        if (pricingRule.paymentMethod !== PaymentMethod.BOTH && data.paymentMethod !== pricingRule.paymentMethod) {
          return NextResponse.json(
            { success: false, error: `Payment method must be ${pricingRule.paymentMethod}` },
            { status: 422 }
          );
        }
      }

      if (pricingRule) {
        const tiersMapped = pricingRule.pricingTiers.map((t: PricingTier) => ({
          ...t,
          pricePerUnit: Number(t.pricePerUnit),
        }));

        const calc = calculatePricing(
          { ...pricingRule, pricingTiers: tiersMapped },
          data.guestCounts as GuestCounts,
          numberOfDays
        );

        pricingData = {
          totalAmount: calc.totalAmount,
          pricingRuleId: data.pricingRuleId,
          paymentBreakdown: calc.breakdown.map((item, idx) => ({
            label: item.label,
            ageGroup: item.ageGroup,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            sortOrder: idx,
          })),
        };
      }
    }

    const registrationNumber = await generateRegistrationNumber();

    const registration = await prisma.registration.create({
      data: {
        registrationNumber,
        activityLocationId: data.activityLocationId,
        userId: session?.user.id ?? null,
        pricingRuleId: pricingData.pricingRuleId ?? null,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email.toLowerCase(),
        phone: data.phone,
        address: data.address,
        startDate,
        endDate,
        numberOfDays,
        notes: data.notes,
        guestCounts: data.guestCounts,
        totalAmount: pricingData.totalAmount,
        paymentMethod: data.paymentMethod ?? null,
        source: data.source ?? 'web',
        status: data.initialStatus ?? 'PENDING',
        embedTokenId: data.embedTokenId ?? null,
        registrationSpots: data.spotIds.length > 0
          ? { create: data.spotIds.map((spotId) => ({ spotId })) }
          : undefined,
        paymentBreakdown: pricingData.paymentBreakdown
          ? { create: pricingData.paymentBreakdown }
          : undefined,
      },
      include: {
        registrationSpots: { include: { spot: { select: { name: true, code: true } } } },
        paymentBreakdown: { orderBy: { sortOrder: 'asc' } },
        pricingRule: true,
      },
    });

    // Send confirmation email (skip for manual owner entries)
    const spotNames = registration.registrationSpots.map(
      (rs: { spot: { name: string; code: string | null } }) =>
        rs.spot.code ? `${rs.spot.name} (${rs.spot.code})` : rs.spot.name
    );

    const pricingRule = registration.pricingRule;

    if (data.sendConfirmation !== false) {
      await sendRegistrationConfirmation(data.email, {
        registrationNumber,
        firstName: data.firstName,
        locationName: location.name,
        activityName: location.activityType.name,
        placeName: location.place.name,
        startDate: startDate.toLocaleDateString('en-GB'),
        endDate: endDate.toLocaleDateString('en-GB'),
        numberOfDays,
        spotNames,
        guestSummary: formatGuestSummary(data.guestCounts as GuestCounts),
        totalAmount: pricingData.totalAmount,
        currency: pricingRule?.currency ?? 'RSD',
        paymentMethod: data.paymentMethod
          ? ({ CASH: 'Cash', CARD: 'Card', BOTH: 'Cash or Card' })[data.paymentMethod]
          : undefined,
        requiresPayment: pricingRule?.requiresPayment ?? false,
        paymentBreakdown: registration.paymentBreakdown.map(
          (item: { label: string; totalPrice: unknown }) => ({
            label: item.label,
            totalPrice: Number(item.totalPrice),
          })
        ),
        editToken: registration.editToken,
      }).catch(console.error);
    }

    return NextResponse.json({ success: true, data: registration }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
