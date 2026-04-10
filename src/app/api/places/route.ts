import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@/types';
import { slugify } from '@/lib/utils';

const placeSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  slug: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  timezone: z.string().default('UTC'),
  mapImageUrl: z.string().optional(),
  mapWidth: z.number().int().positive().optional(),
  mapHeight: z.number().int().positive().optional(),
});

// GET /api/places
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const { searchParams } = req.nextUrl;
  const page = Number(searchParams.get('page') ?? 1);
  const pageSize = Number(searchParams.get('pageSize') ?? 20);
  const search = searchParams.get('search') ?? '';

  const where: Record<string, unknown> = {};

  // Non-admins only see their own places
  if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
    if (!session) {
      // Public: only active places
      where.isActive = true;
    } else {
      where.ownerId = session.user.id;
    }
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { city: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [places, total] = await Promise.all([
    prisma.place.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { activityLocations: true, embedTokens: true } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.place.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: { items: places, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
  });
}

// POST /api/places
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  if (session.user.role !== UserRole.SUPER_ADMIN && session.user.role !== UserRole.PLACE_OWNER) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const result = placeSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ success: false, error: 'Validation failed', details: result.error.flatten().fieldErrors }, { status: 422 });
  }

  const { name, ...rest } = result.data;
  const slug = rest.slug || slugify(name);

  const exists = await prisma.place.findUnique({ where: { slug } });
  if (exists) {
    return NextResponse.json({ success: false, error: 'Slug already in use. Choose a different name or slug.' }, { status: 409 });
  }

  const place = await prisma.place.create({
    data: { name, slug, ...rest, ownerId: session.user.id },
  });

  return NextResponse.json({ success: true, data: place }, { status: 201 });
}
