import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@/types';

const schema = z.object({
  placeId: z.string(),
  activityTypeIds: z.array(z.string()).min(1, 'At least one activity type is required'),
  name: z.string().min(1),
  description: z.string().optional(),
  maxCapacity: z.number().int().positive().optional(),
  requiresSpot: z.boolean().default(true),
  mapWidth: z.number().int().positive().optional(),
  mapHeight: z.number().int().positive().optional(),
  sortOrder: z.number().default(0),
  svgMapData: z.string().optional(),
  mapImageUrl: z.string().optional(),
  gallery: z.string().optional(),
  instructions: z.string().optional(),
});

async function canAccessPlace(placeId: string, userId: string, role: UserRole) {
  if (role === UserRole.SUPER_ADMIN) return true;
  const place = await prisma.place.findUnique({ where: { id: placeId }, select: { ownerId: true } });
  return place?.ownerId === userId;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const placeId = searchParams.get('placeId');
  const activityTypeId = searchParams.get('activityTypeId');

  const where: Record<string, unknown> = { isActive: true };
  if (placeId) where.placeId = placeId;
  if (activityTypeId) {
    where.activityTypes = { some: { activityTypeId } };
  }

  const locations = await prisma.activityLocation.findMany({
    where,
    include: {
      activityTypes: { include: { activityType: { select: { id: true, name: true, icon: true, color: true } } } },
      _count: { select: { spots: true, registrations: true } },
    },
    orderBy: { sortOrder: 'asc' },
  });

  return NextResponse.json({ success: true, data: locations });
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

  const { activityTypeIds, ...locationData } = result.data;
  const location = await prisma.activityLocation.create({ data: locationData });

  await prisma.activityLocationActivity.createMany({
    data: activityTypeIds.map((atId) => ({
      activityLocationId: location.id,
      activityTypeId: atId,
    })),
    skipDuplicates: true,
  });

  return NextResponse.json({ success: true, data: location }, { status: 201 });
}
