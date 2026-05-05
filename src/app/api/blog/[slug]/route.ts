import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@/types';
import { slugify } from '@/lib/utils';

type Props = { params: Promise<{ slug: string }> };

const updateSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  slug: z.string().optional(),
  excerpt: z.string().max(500).optional(),
  body: z.string().min(10).optional(),
  coverUrl: z.string().url().optional().or(z.literal('')),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  placeId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
});

// ── GET /api/blog/[slug] ──────────────────────────────────────────────────────
// Public — returns single PUBLISHED post; author/admin may see DRAFT
export async function GET(req: NextRequest, { params }: Props) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);

  const post = await prisma.blogPost.findUnique({
    where: { slug },
    include: {
      author: { select: { id: true, name: true, image: true } },
      place: { select: { id: true, name: true, slug: true, city: true, coverUrl: true } },
      category: { select: { id: true, name: true, slug: true, color: true } },
      tags: { select: { tag: { select: { id: true, name: true, slug: true } } } },
    },
  });

  if (!post) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  const isOwner = session?.user?.id === post.authorId;
  const isAdmin = session?.user?.role === UserRole.SUPER_ADMIN;

  if (post.status !== 'PUBLISHED' && !isOwner && !isAdmin) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  // Increment view count asynchronously (fire-and-forget)
  if (post.status === 'PUBLISHED') {
    prisma.blogPost.update({ where: { slug }, data: { viewCount: { increment: 1 } } }).catch(() => {});
  }

  return NextResponse.json({ success: true, data: post });
}

// ── PATCH /api/blog/[slug] ────────────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: Props) {
  const session = await getServerSession(authOptions);
  const { slug } = await params;

  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const post = await prisma.blogPost.findUnique({ where: { slug } });
  if (!post) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  const isOwner = session.user.id === post.authorId;
  const isAdmin = session.user.role === UserRole.SUPER_ADMIN;
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const result = updateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: 'Validation failed', details: result.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { tags, status, slug: newSlugRaw, ...rest } = result.data;

  // Validate place access for contributor
  if (rest.placeId && session.user.role === UserRole.CONTRIBUTOR) {
    const access = await prisma.contributorPlaceAccess.findUnique({
      where: { contributorId_placeId: { contributorId: session.user.id, placeId: rest.placeId } },
    });
    if (!access) {
      return NextResponse.json({ success: false, error: 'No access to this place.' }, { status: 403 });
    }
  }

  // Slug change
  let finalSlug = slug;
  if (newSlugRaw && newSlugRaw !== slug) {
    const base = slugify(newSlugRaw);
    finalSlug = base;
    let attempt = 0;
    while (await prisma.blogPost.findFirst({ where: { slug: finalSlug, NOT: { id: post.id } } })) {
      attempt++;
      finalSlug = `${base}-${attempt}`;
    }
  }

  // Handle publishing timestamp
  const publishedAt =
    status === 'PUBLISHED' && post.status !== 'PUBLISHED'
      ? new Date()
      : status === 'DRAFT' || status === 'ARCHIVED'
        ? null
        : undefined;

  // Recalculate reading time if body changed
  const readingTimeMinutes = rest.body
    ? Math.max(1, Math.round(rest.body.trim().split(/\s+/).length / 200))
    : undefined;

  // Rebuild tag connections
  const tagData = tags !== undefined
    ? {
        deleteMany: {},
        create: tags.map((tagName) => {
          const tagSlug = slugify(tagName);
          return {
            tag: {
              connectOrCreate: {
                where: { slug: tagSlug },
                create: { name: tagName, slug: tagSlug },
              },
            },
          };
        }),
      }
    : undefined;

  const updated = await prisma.blogPost.update({
    where: { id: post.id },
    data: {
      ...rest,
      slug: finalSlug,
      ...(status !== undefined && { status }),
      ...(publishedAt !== undefined && { publishedAt }),
      ...(readingTimeMinutes !== undefined && { readingTimeMinutes }),
      ...(tagData && { tags: tagData }),
    },
    include: {
      author: { select: { id: true, name: true } },
      category: true,
      tags: { include: { tag: true } },
    },
  });

  return NextResponse.json({ success: true, data: updated });
}

// ── DELETE /api/blog/[slug] ───────────────────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: Props) {
  const session = await getServerSession(authOptions);
  const { slug } = await params;

  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const post = await prisma.blogPost.findUnique({ where: { slug } });
  if (!post) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  const isOwner = session.user.id === post.authorId;
  const isAdmin = session.user.role === UserRole.SUPER_ADMIN;
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  await prisma.blogPost.delete({ where: { id: post.id } });
  return NextResponse.json({ success: true });
}
