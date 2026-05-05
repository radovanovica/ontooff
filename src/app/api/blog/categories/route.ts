import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@/types';
import { slugify } from '@/lib/utils';

const createSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(300).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  sortOrder: z.number().int().default(0),
});

// ── GET /api/blog/categories ──────────────────────────────────────────────────
// Public — list all categories with post counts
export async function GET() {
  const categories = await prisma.blogCategory.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { posts: { where: { status: 'PUBLISHED' } } } } },
  });

  return NextResponse.json({ success: true, data: categories });
}

// ── POST /api/blog/categories ─────────────────────────────────────────────────
// Admin only
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== UserRole.SUPER_ADMIN) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const result = createSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: 'Validation failed', details: result.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { name, description, color, sortOrder } = result.data;
  const slug = slugify(name);

  const existing = await prisma.blogCategory.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ success: false, error: 'A category with that name already exists.' }, { status: 409 });
  }

  const category = await prisma.blogCategory.create({
    data: { name, slug, description: description ?? null, color: color ?? null, sortOrder },
  });

  return NextResponse.json({ success: true, data: category }, { status: 201 });
}
