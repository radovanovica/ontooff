import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@/types';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: orgId } = await params;
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';

  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

  // Current places linked to org
  const linked = await prisma.place.findMany({
    where: { organizationId: orgId },
    select: { id: true, name: true, city: true, country: true },
    orderBy: { name: 'asc' },
  });

  // Unlinked places (no org) matching optional search
  const unlinked = await prisma.place.findMany({
    where: {
      organizationId: null,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { city: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    select: { id: true, name: true, city: true, country: true },
    orderBy: { name: 'asc' },
    take: 30,
  });

  return NextResponse.json({ success: true, data: { linked, unlinked } });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: orgId } = await params;
  const body = await req.json();
  const { placeId, action } = body;

  if (!placeId || !['assign', 'unlink'].includes(action)) {
    return NextResponse.json({ error: 'placeId and action (assign|unlink) required' }, { status: 400 });
  }

  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

  const place = await prisma.place.findUnique({ where: { id: placeId } });
  if (!place) return NextResponse.json({ error: 'Place not found' }, { status: 404 });

  const updated = await prisma.place.update({
    where: { id: placeId },
    data: { organizationId: action === 'assign' ? orgId : null },
    select: { id: true, name: true, city: true, organizationId: true },
  });

  return NextResponse.json({ success: true, data: updated });
}
