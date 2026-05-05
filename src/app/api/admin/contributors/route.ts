import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@/types';

const grantSchema = z.object({ placeId: z.string() });

// ── GET /api/admin/contributors ───────────────────────────────────────────────
// List all CONTRIBUTOR users with their place access + post counts
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== UserRole.SUPER_ADMIN) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const search = searchParams.get('search');
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const pageSize = Math.min(Number(searchParams.get('pageSize') ?? 20), 50);

  const where = {
    role: 'CONTRIBUTOR' as const,
    ...(search
      ? { OR: [{ name: { contains: search, mode: 'insensitive' as const } }, { email: { contains: search, mode: 'insensitive' as const } }] }
      : {}),
  };

  const [contributors, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        isActive: true,
        createdAt: true,
        placeAccess: {
          include: {
            place: { select: { id: true, name: true, city: true } },
          },
        },
        _count: { select: { blogPosts: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: contributors,
    meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
  });
}

// ── POST /api/admin/contributors ──────────────────────────────────────────────
// Grant a contributor access to a place
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== UserRole.SUPER_ADMIN) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const contributorId = searchParams.get('contributorId');
  if (!contributorId) {
    return NextResponse.json({ success: false, error: 'contributorId required' }, { status: 400 });
  }

  const body = await req.json();
  const result = grantSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ success: false, error: 'placeId required' }, { status: 422 });
  }

  const contributor = await prisma.user.findUnique({ where: { id: contributorId } });
  if (!contributor || contributor.role !== UserRole.CONTRIBUTOR) {
    return NextResponse.json({ success: false, error: 'Contributor not found.' }, { status: 404 });
  }

  const access = await prisma.contributorPlaceAccess.upsert({
    where: { contributorId_placeId: { contributorId, placeId: result.data.placeId } },
    create: { contributorId, placeId: result.data.placeId, grantedById: session.user.id },
    update: {},
    include: { place: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ success: true, data: access }, { status: 201 });
}
