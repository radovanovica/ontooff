import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@/types';
import { slugify } from '@/lib/utils';

const createSchema = z.object({
  title: z.string().min(3).max(200),
  slug: z.string().optional(),
  excerpt: z.string().max(500).optional(),
  body: z.string().min(10),
  coverUrl: z.string().url().optional().or(z.literal('')),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  placeId: z.string().optional(),
  categoryId: z.string().optional(),
  tags: z.array(z.string()).optional(), // tag names
});

// ── GET /api/blog ─────────────────────────────────────────────────────────────
// Public — returns PUBLISHED posts with pagination + filters
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const pageSize = Math.min(Number(searchParams.get('pageSize') ?? 12), 50);
  const category = searchParams.get('category');
  const tag = searchParams.get('tag');
  const search = searchParams.get('search');
  const placeId = searchParams.get('placeId');
  const authorId = searchParams.get('authorId');

  // Admin/contributor may also request drafts
  const session = await getServerSession(authOptions);
  const isPrivileged =
    session?.user?.role === UserRole.SUPER_ADMIN ||
    session?.user?.role === UserRole.CONTRIBUTOR;

  const statusFilter = searchParams.get('status');
  const where: Record<string, unknown> = {};

  if (isPrivileged && statusFilter) {
    where.status = statusFilter;
    // contributor can only see own drafts
    if (
      session!.user.role === UserRole.CONTRIBUTOR &&
      statusFilter === 'DRAFT'
    ) {
      where.authorId = session!.user.id;
    }
  } else {
    where.status = 'PUBLISHED';
  }

  if (category) where.category = { slug: category };
  if (placeId) where.placeId = placeId;
  if (authorId) where.authorId = authorId;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { excerpt: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (tag) {
    where.tags = { some: { tag: { slug: tag } } };
  }

  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        coverUrl: true,
        status: true,
        publishedAt: true,
        readingTimeMinutes: true,
        viewCount: true,
        createdAt: true,
        author: { select: { id: true, name: true, image: true } },
        place: { select: { id: true, name: true, slug: true } },
        category: { select: { id: true, name: true, slug: true, color: true } },
        tags: { select: { tag: { select: { id: true, name: true, slug: true } } } },
      },
    }),
    prisma.blogPost.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: posts,
    meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
  });
}

// ── POST /api/blog ────────────────────────────────────────────────────────────
// Contributor or Admin creates a post
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user ||
    (session.user.role !== UserRole.CONTRIBUTOR &&
      session.user.role !== UserRole.SUPER_ADMIN)
  ) {
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

  const { title, slug: rawSlug, excerpt, body: postBody, coverUrl, status, placeId, categoryId, tags } = result.data;

  // Contributor can only attach a place they have access to
  if (placeId && session.user.role === UserRole.CONTRIBUTOR) {
    const access = await prisma.contributorPlaceAccess.findUnique({
      where: { contributorId_placeId: { contributorId: session.user.id, placeId } },
    });
    if (!access) {
      return NextResponse.json(
        { success: false, error: 'You do not have access to this place.' },
        { status: 403 },
      );
    }
  }

  const baseSlug = rawSlug || slugify(title);
  let slug = baseSlug;
  let attempt = 0;
  while (await prisma.blogPost.findUnique({ where: { slug } })) {
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }

  // Resolve / create tags
  const tagConnections: { tag: { connectOrCreate: { where: { slug: string }; create: { name: string; slug: string } } } }[] = [];
  for (const tagName of tags ?? []) {
    const tagSlug = slugify(tagName);
    tagConnections.push({
      tag: {
        connectOrCreate: {
          where: { slug: tagSlug },
          create: { name: tagName, slug: tagSlug },
        },
      },
    });
  }

  const wordCount = postBody.trim().split(/\s+/).length;
  const readingTimeMinutes = Math.max(1, Math.round(wordCount / 200));

  const post = await prisma.blogPost.create({
    data: {
      title,
      slug,
      excerpt: excerpt ?? null,
      body: postBody,
      coverUrl: coverUrl || null,
      status,
      authorId: session.user.id,
      placeId: placeId ?? null,
      categoryId: categoryId ?? null,
      readingTimeMinutes,
      publishedAt: status === 'PUBLISHED' ? new Date() : null,
      tags: tagConnections.length > 0 ? { create: tagConnections } : undefined,
    },
    include: {
      author: { select: { id: true, name: true } },
      category: true,
      tags: { include: { tag: true } },
    },
  });

  return NextResponse.json({ success: true, data: post }, { status: 201 });
}
