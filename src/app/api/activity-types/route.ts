import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@/types';

const schema = z.object({
  placeId: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  sortOrder: z.number().default(0),
});

async function canAccessPlace(placeId: string, userId: string, role: UserRole) {
  if (role === UserRole.SUPER_ADMIN) return true;
  const place = await prisma.place.findUnique({ where: { id: placeId }, select: { ownerId: true } });
  return place?.ownerId === userId;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const placeId = searchParams.get('placeId');
  if (!placeId) return NextResponse.json({ success: false, error: 'placeId required' }, { status: 400 });

  const activityTypes = await prisma.activityType.findMany({
    where: { placeId, isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { activityLocations: true } } },
  });

  return NextResponse.json({ success: true, data: activityTypes });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const result = schema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ success: false, error: 'Validation failed', details: result.error.flatten().fieldErrors }, { status: 422 });
  }

  if (!(await canAccessPlace(result.data.placeId, session.user.id, session.user.role))) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const activityType = await prisma.activityType.create({ data: result.data });
  return NextResponse.json({ success: true, data: activityType }, { status: 201 });
}
