import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@/types';

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}(T.+)?$/).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  maxReservations: z.number().int().positive().optional().nullable(),
  reservationDeadline: z.string().datetime({ offset: true }).optional().nullable(),
  pricingRuleId: z.string().optional().nullable(),
  pricingRuleIds: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

// GET /api/events/[id] — public event detail
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const event = await prisma.placeEvent.findFirst({
    where: { id, place: { isDemo: false } },
    include: {
      place: { select: { id: true, name: true, slug: true, city: true, country: true, coverUrl: true, logoUrl: true, phone: true, email: true } },
      pricingRule: { include: { pricingTiers: { orderBy: { sortOrder: 'asc' } } } },
      eventPricingRules: {
        orderBy: { sortOrder: 'asc' },
        include: { pricingRule: { include: { pricingTiers: { orderBy: { sortOrder: 'asc' } } } } },
      },
      _count: { select: { registrations: { where: { status: { notIn: ['CANCELLED'] } } } } },
    },
  });

  if (!event) return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });

  // Compute total guest count for capacity display
  const regsForGuests = await prisma.registration.findMany({
    where: { eventId: event.id, status: { notIn: ['CANCELLED'] } },
    select: { guestCounts: true },
  });
  const totalGuests = regsForGuests.reduce((acc, reg) => {
    const counts = (reg.guestCounts ?? {}) as Record<string, number>;
    const sum = Object.values(counts).reduce((s, v) => s + (Number(v) || 0), 0);
    return acc + (sum > 0 ? sum : 1);
  }, 0);

  return NextResponse.json({ success: true, data: { ...event, totalGuests } });
}

// PATCH /api/events/[id] — owner update
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const event = await prisma.placeEvent.findUnique({
    where: { id },
    include: { place: { select: { ownerId: true } } },
  });
  if (!event) return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });

  const canManage = session.user.role === UserRole.SUPER_ADMIN || event.place.ownerId === session.user.id;
  if (!canManage) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const result = updateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: 'Validation failed', details: result.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  if (result.data.pricingRuleId || (result.data.pricingRuleIds?.length ?? 0) > 0) {
    const allRuleIds = Array.from(new Set([
      ...(result.data.pricingRuleIds ?? []),
      ...(result.data.pricingRuleId ? [result.data.pricingRuleId] : []),
    ]));
    const validRules = await prisma.pricingRule.findMany({
      where: { id: { in: allRuleIds }, isActive: true, activityType: { place: { id: event.placeId } } },
      select: { id: true },
    });
    if (validRules.length !== allRuleIds.length) {
      return NextResponse.json({ success: false, error: 'One or more pricing rules are invalid' }, { status: 422 });
    }
  }

  const { eventDate, reservationDeadline, pricingRuleIds, ...rest } = result.data;

  // If pricingRuleIds supplied, rebuild the join table
  if (pricingRuleIds !== undefined) {
    await prisma.eventPricingRule.deleteMany({ where: { eventId: id } });
    if (pricingRuleIds.length > 0) {
      await prisma.eventPricingRule.createMany({
        data: pricingRuleIds.map((ruleId, idx) => ({ eventId: id, pricingRuleId: ruleId, sortOrder: idx })),
      });
    }
  }

  const updated = await prisma.placeEvent.update({
    where: { id },
    data: {
      ...rest,
      // keep legacy pricingRuleId in sync: first of the list, or explicit value
      ...(pricingRuleIds !== undefined
        ? { pricingRuleId: pricingRuleIds[0] ?? null }
        : {}),
      ...(eventDate !== undefined ? { eventDate: new Date(eventDate) } : {}),
      ...(reservationDeadline !== undefined
        ? { reservationDeadline: reservationDeadline ? new Date(reservationDeadline) : null }
        : {}),
    },
    include: {
      pricingRule: { include: { pricingTiers: { orderBy: { sortOrder: 'asc' } } } },
      eventPricingRules: {
        orderBy: { sortOrder: 'asc' },
        include: { pricingRule: { include: { pricingTiers: { orderBy: { sortOrder: 'asc' } } } } },
      },
      _count: { select: { registrations: { where: { status: { notIn: ['CANCELLED'] } } } } },
    },
  });

  return NextResponse.json({ success: true, data: updated });
}

// DELETE /api/events/[id] — owner delete (blocks if active reservations)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const event = await prisma.placeEvent.findUnique({
    where: { id },
    include: { place: { select: { ownerId: true } } },
  });
  if (!event) return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });

  const canManage = session.user.role === UserRole.SUPER_ADMIN || event.place.ownerId === session.user.id;
  if (!canManage) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

  const activeCount = await prisma.registration.count({
    where: { eventId: id, status: { notIn: ['CANCELLED'] } },
  });
  if (activeCount > 0) {
    return NextResponse.json(
      { success: false, error: `Cannot delete event with ${activeCount} active reservation(s). Cancel them first.` },
      { status: 409 }
    );
  }

  await prisma.placeEvent.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
