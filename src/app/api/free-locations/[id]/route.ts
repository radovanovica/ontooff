import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { UserRole } from '@/types';

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  logoUrl: z.string().optional().nullable(),
  coverUrl: z.string().optional().nullable(),
  gallery: z.string().optional().nullable(),
  coverImageIndex: z.number().nullable().optional(),
  instructions: z.string().optional(),
  isActive: z.boolean().optional(),
  tagIds: z.array(z.string()).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/free-locations/[id]
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  // Support lookup by slug too
  const location = await prisma.freeLocation.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    include: { tags: { include: { tag: true } } },
  });

  if (!location) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: location });
}

// PATCH /api/free-locations/[id] — admin only
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const { tagIds, ...data } = parsed.data;

  const location = await prisma.freeLocation.update({
    where: { id },
    data: {
      ...data,
      email: data.email === '' ? null : data.email,
      website: data.website === '' ? null : data.website,
      ...(tagIds !== undefined && {
        tags: {
          deleteMany: {},
          create: tagIds.map((tagId) => ({ tagId })),
        },
      }),
    },
    include: { tags: { include: { tag: true } } },
  });

  return NextResponse.json({ success: true, data: location });
}

// DELETE /api/free-locations/[id] — admin only
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  await prisma.freeLocation.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
