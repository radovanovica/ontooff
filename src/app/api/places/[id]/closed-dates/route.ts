import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@/types';

const createSchema = z.object({
  activityLocationId: z.string().optional().nullable(),
  activityTypeId: z.string().optional().nullable(),
  date: z.string().optional().nullable(),         // ISO date string e.g. "2026-07-04"
  dayOfWeek: z.number().int().min(0).max(6).optional().nullable(), // 0=Sun
  isRecurring: z.boolean().default(false),
  reason: z.string().max(200).optional().nullable(),
});

async function checkAccess(placeId: string, userId: string, role: UserRole) {
  const place = await prisma.place.findUnique({ where: { id: placeId }, select: { ownerId: true } });
  if (!place) return false;
  return role === UserRole.SUPER_ADMIN || place.ownerId === userId;
}

// GET /api/places/[id]/closed-dates
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { id: placeId } = await params;
  const hasAccess = await checkAccess(placeId, session.user.id, session.user.role as UserRole);
  if (!hasAccess) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

  const closedDates = await prisma.closedDate.findMany({
    where: { placeId },
    orderBy: [{ isRecurring: 'asc' }, { date: 'asc' }, { dayOfWeek: 'asc' }],
    include: {
      activityLocation: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ success: true, data: closedDates });
}

// POST /api/places/[id]/closed-dates
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { id: placeId } = await params;
  const hasAccess = await checkAccess(placeId, session.user.id, session.user.role as UserRole);
  if (!hasAccess) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 422 });
  }

  const { activityLocationId, activityTypeId, date, dayOfWeek, isRecurring, reason } = parsed.data;

  if (!isRecurring && !date) {
    return NextResponse.json({ success: false, error: 'date is required for one-off closures' }, { status: 422 });
  }
  if (isRecurring && dayOfWeek == null) {
    return NextResponse.json({ success: false, error: 'dayOfWeek is required for recurring closures' }, { status: 422 });
  }

  const closedDate = await prisma.closedDate.create({
    data: {
      placeId,
      activityLocationId: activityLocationId ?? null,
      activityTypeId: activityTypeId ?? null,
      date: date ? new Date(date) : null,
      dayOfWeek: isRecurring ? dayOfWeek : null,
      isRecurring,
      reason: reason ?? null,
    },
    include: {
      activityLocation: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ success: true, data: closedDate }, { status: 201 });
}
