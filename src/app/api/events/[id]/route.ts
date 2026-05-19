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
  isActive: z.boolean().optional(),
});

// GET /api/events/[id] — public event detail
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const event = await prisma.placeEvent.findUnique({
    where: { id },
    include: {
      place: { select: { id: true, name: true, slug: true, city: true, country: true, coverUrl: true, logoUrl: true, phone: true, email: true } },
      pricingRule: { include: { pricingTiers: { orderBy: { sortOrder: 'asc' } } } },
      _count: { select: { registrations: { where: { status: { notIn: ['CANCELLED'] } } } } },
    },
  });

  if (!event) return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });

  return NextResponse.json({ success: true, data: event });
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

  const { eventDate, reservationDeadline, ...rest } = result.data;

  const updated = await prisma.placeEvent.update({
    where: { id },
    data: {
      ...rest,
      ...(eventDate !== undefined ? { eventDate: new Date(eventDate) } : {}),
      ...(reservationDeadline !== undefined
        ? { reservationDeadline: reservationDeadline ? new Date(reservationDeadline) : null }
        : {}),
    },
    include: {
      pricingRule: { include: { pricingTiers: { orderBy: { sortOrder: 'asc' } } } },
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
