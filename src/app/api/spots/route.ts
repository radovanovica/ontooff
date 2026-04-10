import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@/types';

const schema = z.object({
  activityLocationId: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  code: z.string().optional(),
  maxPeople: z.number().int().positive().default(1),
  amenities: z.array(z.string()).default([]),
  status: z.enum(['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'DISABLED']).default('AVAILABLE'),
  sortOrder: z.number().default(0),
  svgShapeData: z.string().optional(),
});

async function canAccessLocation(locationId: string, userId: string, role: UserRole) {
  if (role === UserRole.SUPER_ADMIN) return true;
  const loc = await prisma.activityLocation.findUnique({
    where: { id: locationId },
    include: { place: { select: { ownerId: true } } },
  });
  return loc?.place.ownerId === userId;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const locationId = searchParams.get('activityLocationId');
  if (!locationId) return NextResponse.json({ success: false, error: 'activityLocationId required' }, { status: 400 });

  const spots = await prisma.spot.findMany({
    where: { activityLocationId: locationId },
    orderBy: { sortOrder: 'asc' },
  });

  return NextResponse.json({ success: true, data: spots });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const result = schema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ success: false, error: 'Validation failed', details: result.error.flatten().fieldErrors }, { status: 422 });
  }

  if (!(await canAccessLocation(result.data.activityLocationId, session.user.id, session.user.role))) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const spot = await prisma.spot.create({ data: result.data });
  return NextResponse.json({ success: true, data: spot }, { status: 201 });
}

const patchSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  code: z.string().optional(),
  description: z.string().optional(),
  maxPeople: z.number().int().positive().optional(),
  status: z.enum(['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'DISABLED']).optional(),
  amenities: z.array(z.string()).optional(),
  sortOrder: z.number().optional(),
  svgShapeData: z.string().optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const result = patchSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ success: false, error: 'Validation failed', details: result.error.flatten().fieldErrors }, { status: 422 });
  }

  const { id, ...data } = result.data;
  const spot = await prisma.spot.findUnique({ where: { id } });
  if (!spot) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  if (!(await canAccessLocation(spot.activityLocationId, session.user.id, session.user.role))) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const updated = await prisma.spot.update({ where: { id }, data });
  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id } = z.object({ id: z.string() }).parse(body);

  const spot = await prisma.spot.findUnique({ where: { id } });
  if (!spot) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  if (!(await canAccessLocation(spot.activityLocationId, session.user.id, session.user.role))) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  await prisma.spot.delete({ where: { id } });
  return NextResponse.json({ success: true, message: 'Spot deleted' });
}
