import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@/types';
import { slugify } from '@/lib/utils';

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  slug: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  timezone: z.string().optional(),
  isActive: z.boolean().optional(),
  logoUrl: z.string().optional(),
  coverUrl: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  mapImageUrl: z.string().nullable().optional(),
  mapWidth: z.number().int().positive().nullable().optional(),
  mapHeight: z.number().int().positive().nullable().optional(),
});

async function getPlaceAndCheckAccess(placeId: string, userId: string, role: UserRole) {
  const place = await prisma.place.findUnique({ where: { id: placeId } });
  if (!place) return null;
  if (role !== UserRole.SUPER_ADMIN && place.ownerId !== userId) return null;
  return place;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const place = await prisma.place.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      activityTypes: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      activityLocations: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: {
          activityType: true,
          spots: { orderBy: { sortOrder: 'asc' } },
        },
      },
    },
  });

  if (!place) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true, data: place });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const place = await getPlaceAndCheckAccess(id, session.user.id, session.user.role);
  if (!place) return NextResponse.json({ success: false, error: 'Not found or forbidden' }, { status: 404 });

  const body = await req.json();
  const result = updateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ success: false, error: 'Validation failed', details: result.error.flatten().fieldErrors }, { status: 422 });
  }

  const data = result.data;
  if (data.name && !data.slug) {
    data.slug = slugify(data.name);
  }

  const updated = await prisma.place.update({ where: { id }, data });
  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const place = await getPlaceAndCheckAccess(id, session.user.id, session.user.role);
  if (!place) return NextResponse.json({ success: false, error: 'Not found or forbidden' }, { status: 404 });

  await prisma.place.delete({ where: { id } });
  return NextResponse.json({ success: true, message: 'Place deleted' });
}
