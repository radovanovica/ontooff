import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { UserRole } from '@/types';

const createSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
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
  instructions: z.string().optional(),
  isActive: z.boolean().default(true),
  tagIds: z.array(z.string()).optional(),
});

// GET /api/free-locations — public list
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tagSlug = searchParams.get('tag');
  const isActiveParam = searchParams.get('isActive');

  const where: Record<string, unknown> = {};
  if (isActiveParam !== 'all') where.isActive = true;
  if (tagSlug) {
    where.tags = { some: { tag: { slug: tagSlug } } };
  }

  const locations = await prisma.freeLocation.findMany({
    where,
    include: {
      tags: { include: { tag: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ success: true, data: locations });
}

// POST /api/free-locations — admin only
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const { tagIds, ...data } = parsed.data;

  const location = await prisma.freeLocation.create({
    data: {
      ...data,
      email: data.email || null,
      website: data.website || null,
      tags: tagIds?.length
        ? { create: tagIds.map((tagId) => ({ tagId })) }
        : undefined,
    },
    include: { tags: { include: { tag: true } } },
  });

  return NextResponse.json({ success: true, data: location }, { status: 201 });
}
