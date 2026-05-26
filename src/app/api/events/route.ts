import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@/types';

async function canManagePlace(placeId: string, userId: string, role: UserRole): Promise<boolean> {
  if (role === UserRole.SUPER_ADMIN) return true;
  const place = await prisma.place.findUnique({ where: { id: placeId }, select: { ownerId: true } });
  return place?.ownerId === userId;
}

const createSchema = z.object({
  placeId: z.string(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().nullable().or(z.literal('')),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}(T.+)?$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  maxReservations: z.number().int().positive().optional().nullable(),
  reservationDeadline: z.string().datetime({ offset: true }).optional().nullable(),
  pricingRuleId: z.string().optional().nullable(),   // legacy single-rule
  pricingRuleIds: z.array(z.string()).optional(),     // multiple rules
  isActive: z.boolean().default(true),
});

// GET /api/events
// ?placeId= (owner) — list events for a place
// ?upcoming=true&location=... — list upcoming public events
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const placeId = searchParams.get('placeId');
  const upcoming = searchParams.get('upcoming');
  const location = searchParams.get('location');
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize') ?? 20)));

  // Public upcoming events query (no auth required)
  if (upcoming === 'true') {
    const where: Record<string, unknown> = {
      isActive: true,
      eventDate: { gte: new Date() },
      ...(placeId ? { placeId } : {}),
    };

    if (location) {
      where.place = {
        isDemo: false,
        OR: [
          { city: { contains: location, mode: 'insensitive' } },
          { country: { contains: location, mode: 'insensitive' } },
        ],
      };
    } else {
      where.place = { isDemo: false };
    }

    const [events, total] = await Promise.all([
      prisma.placeEvent.findMany({
        where,
        include: {
          place: { select: { id: true, name: true, slug: true, city: true, country: true, coverUrl: true, logoUrl: true } },
          pricingRule: { select: { id: true, name: true, currency: true, requiresPayment: true, paymentMethod: true, pricingTiers: true } },
          eventPricingRules: {
            orderBy: { sortOrder: 'asc' },
            include: { pricingRule: { include: { pricingTiers: { orderBy: { sortOrder: 'asc' } } } } },
          },
          _count: { select: { registrations: { where: { status: { notIn: ['CANCELLED'] } } } } },
        },
        orderBy: { eventDate: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.placeEvent.count({ where }),
    ]);

    // Compute total guest count per event (sum of guestCounts values across all non-cancelled registrations)
    const eventIds = events.map((e) => e.id);
    const regsForGuests = eventIds.length > 0
      ? await prisma.registration.findMany({
          where: { eventId: { in: eventIds }, status: { notIn: ['CANCELLED'] } },
          select: { eventId: true, guestCounts: true },
        })
      : [];
    const guestTotalsMap = new Map<string, number>();
    for (const reg of regsForGuests) {
      if (!reg.eventId) continue;
      const counts = (reg.guestCounts ?? {}) as Record<string, number>;
      const sum = Object.values(counts).reduce((acc, v) => acc + (Number(v) || 0), 0);
      guestTotalsMap.set(reg.eventId, (guestTotalsMap.get(reg.eventId) ?? 0) + (sum > 0 ? sum : 1));
    }
    const eventsWithGuests = events.map((e) => ({
      ...e,
      totalGuests: guestTotalsMap.get(e.id) ?? 0,
    }));

    return NextResponse.json({
      success: true,
      data: { items: eventsWithGuests, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    });
  }

  // Owner / admin query
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  if (!placeId) return NextResponse.json({ success: false, error: 'placeId required' }, { status: 400 });

  if (!(await canManagePlace(placeId, session.user.id, session.user.role as UserRole))) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const [events, total] = await Promise.all([
    prisma.placeEvent.findMany({
      where: { placeId },
      include: {
        pricingRule: { select: { id: true, name: true, currency: true, requiresPayment: true, pricingTiers: true } },
        eventPricingRules: {
          orderBy: { sortOrder: 'asc' },
          include: { pricingRule: { include: { pricingTiers: { orderBy: { sortOrder: 'asc' } } } } },
        },
        _count: { select: { registrations: { where: { status: { notIn: ['CANCELLED'] } } } } },
      },
      orderBy: { eventDate: 'asc' },
    }),
    prisma.placeEvent.count({ where: { placeId } }),
  ]);

  return NextResponse.json({ success: true, data: { items: events, total } });
}

// POST /api/events — create event (owner)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const result = createSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: 'Validation failed', details: result.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { placeId, title, description, imageUrl, eventDate, startTime, endTime, maxReservations, reservationDeadline, pricingRuleId, pricingRuleIds, isActive } = result.data;

  if (!(await canManagePlace(placeId, session.user.id, session.user.role as UserRole))) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  // Collect all rule IDs to validate (legacy single + multi list)
  const allRuleIds = Array.from(new Set([
    ...(pricingRuleIds ?? []),
    ...(pricingRuleId ? [pricingRuleId] : []),
  ]));

  if (allRuleIds.length > 0) {
    const validRules = await prisma.pricingRule.findMany({
      where: { id: { in: allRuleIds }, isActive: true, activityType: { place: { id: placeId } } },
      select: { id: true },
    });
    if (validRules.length !== allRuleIds.length) {
      return NextResponse.json({ success: false, error: 'One or more pricing rules are invalid' }, { status: 422 });
    }
  }

  const event = await prisma.placeEvent.create({
    data: {
      placeId,
      title,
      description: description ?? null,
      imageUrl: imageUrl || null,
      eventDate: new Date(eventDate),
      startTime,
      endTime,
      maxReservations: maxReservations ?? null,
      reservationDeadline: reservationDeadline ? new Date(reservationDeadline) : null,
      pricingRuleId: pricingRuleId ?? (pricingRuleIds?.[0] ?? null),
      isActive,
      eventPricingRules: pricingRuleIds && pricingRuleIds.length > 0
        ? {
            create: pricingRuleIds.map((id, idx) => ({ pricingRuleId: id, sortOrder: idx })),
          }
        : undefined,
    },
    include: {
      pricingRule: { select: { id: true, name: true, currency: true, requiresPayment: true, pricingTiers: true } },
      eventPricingRules: {
        orderBy: { sortOrder: 'asc' },
        include: { pricingRule: { include: { pricingTiers: { orderBy: { sortOrder: 'asc' } } } } },
      },
      _count: { select: { registrations: true } },
    },
  });

  return NextResponse.json({ success: true, data: event }, { status: 201 });
}
