import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@/types';

// ── Auth helper ──────────────────────────────────────────────────────────────

async function canManageSpot(spotId: string, userId: string, role: UserRole) {
  if (role === UserRole.SUPER_ADMIN) return true;
  const spot = await prisma.spot.findUnique({
    where: { id: spotId },
    include: { activityLocation: { include: { place: { select: { ownerId: true } } } } },
  });
  return spot?.activityLocation.place.ownerId === userId;
}

// ── Schemas ──────────────────────────────────────────────────────────────────

const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;

const createSchema = z.object({
  spotId: z.string(),
  name: z.string().min(1),
  isWholeDay: z.boolean().default(false),
  startTime: z.string().regex(timeRe, 'Must be HH:MM').optional().nullable(),
  endTime: z.string().regex(timeRe, 'Must be HH:MM').optional().nullable(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
}).refine(
  (d) => d.isWholeDay || (d.startTime && d.endTime),
  { message: 'startTime and endTime are required for non-whole-day timeslots', path: ['startTime'] }
);

const patchSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  isWholeDay: z.boolean().optional(),
  startTime: z.string().regex(timeRe, 'Must be HH:MM').optional().nullable(),
  endTime: z.string().regex(timeRe, 'Must be HH:MM').optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

// ── GET /api/timeslots?spotId= ────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const spotId = req.nextUrl.searchParams.get('spotId');
  if (!spotId) return NextResponse.json({ success: false, error: 'spotId required' }, { status: 400 });

  const timeslots = await prisma.timeslot.findMany({
    where: { spotId, isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  return NextResponse.json({ success: true, data: timeslots });
}

// ── POST /api/timeslots ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const result = createSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ success: false, error: 'Validation failed', details: result.error.flatten().fieldErrors }, { status: 422 });
  }

  if (!(await canManageSpot(result.data.spotId, session.user.id, session.user.role))) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  // If whole-day: strip times
  const data = result.data.isWholeDay
    ? { ...result.data, startTime: null, endTime: null }
    : result.data;

  // Validate: spots with maxDays > 1 can only have whole-day timeslots
  if (!data.isWholeDay) {
    const spot = await prisma.spot.findUnique({ where: { id: data.spotId }, select: { maxDays: true } });
    if (spot?.maxDays != null && spot.maxDays > 1) {
      return NextResponse.json(
        { success: false, error: 'Spots with maxDays > 1 can only have whole-day timeslots' },
        { status: 422 }
      );
    }
  }

  const timeslot = await prisma.timeslot.create({ data });
  return NextResponse.json({ success: true, data: timeslot }, { status: 201 });
}

// ── PATCH /api/timeslots ──────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const result = patchSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ success: false, error: 'Validation failed', details: result.error.flatten().fieldErrors }, { status: 422 });
  }

  const { id, ...updateData } = result.data;
  const timeslot = await prisma.timeslot.findUnique({ where: { id }, select: { spotId: true } });
  if (!timeslot) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  if (!(await canManageSpot(timeslot.spotId, session.user.id, session.user.role))) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  // If being set to whole-day, strip times
  const patch = updateData.isWholeDay === true
    ? { ...updateData, startTime: null, endTime: null }
    : updateData;

  const updated = await prisma.timeslot.update({ where: { id }, data: patch });
  return NextResponse.json({ success: true, data: updated });
}

// ── DELETE /api/timeslots ─────────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json() as { id: string };
  if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });

  const timeslot = await prisma.timeslot.findUnique({ where: { id }, select: { spotId: true } });
  if (!timeslot) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  if (!(await canManageSpot(timeslot.spotId, session.user.id, session.user.role))) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  await prisma.timeslot.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
