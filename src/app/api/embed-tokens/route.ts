import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@/types';

const schema = z.object({
  placeId: z.string(),
  activityLocationId: z.string().optional(),
  label: z.string().min(1),
  allowedOrigins: z.array(z.string()).default([]),
  expiresAt: z.string().datetime().nullable().optional(),
});

async function canManagePlace(placeId: string, userId: string, role: UserRole) {
  if (role === UserRole.SUPER_ADMIN) return true;
  const place = await prisma.place.findUnique({ where: { id: placeId }, select: { ownerId: true } });
  return place?.ownerId === userId;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const placeId = req.nextUrl.searchParams.get('placeId');
  if (!placeId) return NextResponse.json({ success: false, error: 'placeId required' }, { status: 400 });

  if (!(await canManagePlace(placeId, session.user.id, session.user.role))) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const tokens = await prisma.embedToken.findMany({
    where: { placeId },
    include: { activityLocation: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ success: true, data: tokens });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const result = schema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ success: false, error: 'Validation failed', details: result.error.flatten().fieldErrors }, { status: 422 });
  }

  if (!(await canManagePlace(result.data.placeId, session.user.id, session.user.role))) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const token = await prisma.embedToken.create({
    data: {
      ...result.data,
      expiresAt: result.data.expiresAt ? new Date(result.data.expiresAt) : null,
    },
  });

  return NextResponse.json({ success: true, data: token }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });

  const token = await prisma.embedToken.findUnique({ where: { id }, select: { id: true, placeId: true } });
  if (!token) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  if (!(await canManagePlace(token.placeId, session.user.id, session.user.role))) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  await prisma.embedToken.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
