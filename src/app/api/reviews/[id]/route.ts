import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@/types';

const moderateSchema = z.object({
  action: z.enum(['approve', 'reject']),
});

// Helper: verify the session user owns the place of this review
async function canModerate(reviewId: string, userId: string, role: UserRole) {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: { place: { select: { ownerId: true } } },
  });
  if (!review) return null;
  // Super admins can moderate anything
  if (role === UserRole.SUPER_ADMIN) return review;
  // Place owners can moderate their place's reviews
  if (review.place && review.place.ownerId === userId) return review;
  // Community reviews (no place) — only super admins (handled above)
  return null;
}

// ── PATCH /api/reviews/[id] — approve or reject ──────────────────────────────
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const review = await canModerate(id, session.user.id, session.user.role);
  if (!review) return NextResponse.json({ success: false, error: 'Not found or forbidden' }, { status: 404 });

  const body = await req.json();
  const result = moderateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 422 });
  }

  const { action } = result.data;
  const updated = await prisma.review.update({
    where: { id },
    data: {
      status: action === 'approve' ? 'APPROVED' : 'REJECTED',
    },
  });

  return NextResponse.json({ success: true, data: updated });
}

// ── DELETE /api/reviews/[id] — owner or super admin removes a review ──────────
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const review = await canModerate(id, session.user.id, session.user.role);
  if (!review) return NextResponse.json({ success: false, error: 'Not found or forbidden' }, { status: 404 });

  await prisma.review.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

// ── GET /api/reviews/[id] — owner reads all reviews for their place ───────────
// Used by the owner Reviews tab (all statuses: pending/approved/rejected)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Here `id` is a placeId when called from owner dashboard
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const status = searchParams.get('status'); // 'pending' | 'approved' | 'rejected' | null
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const pageSize = Math.min(Math.max(1, Number(searchParams.get('pageSize') ?? 20)), 50);

  const place = await prisma.place.findUnique({ where: { id }, select: { ownerId: true } });
  if (!place) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  if (session.user.role !== UserRole.SUPER_ADMIN && place.ownerId !== session.user.id) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const where: Record<string, unknown> = { placeId: id };
  if (status === 'pending') { where.status = 'PENDING'; }
  if (status === 'approved') { where.status = 'APPROVED'; }
  if (status === 'rejected') { where.status = 'REJECTED'; }

  const [total, reviews] = await Promise.all([
    prisma.review.count({ where }),
    prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        activityLocation: { select: { id: true, name: true } },
        registration: { select: { registrationNumber: true, startDate: true, endDate: true } },
      },
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: { items: reviews, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
  });
}
