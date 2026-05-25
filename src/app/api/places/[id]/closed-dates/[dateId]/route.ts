import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@/types';

async function checkAccess(placeId: string, userId: string, role: UserRole) {
  const place = await prisma.place.findUnique({ where: { id: placeId }, select: { ownerId: true } });
  if (!place) return false;
  return role === UserRole.SUPER_ADMIN || place.ownerId === userId;
}

// DELETE /api/places/[id]/closed-dates/[dateId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; dateId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { id: placeId, dateId } = await params;
  const hasAccess = await checkAccess(placeId, session.user.id, session.user.role as UserRole);
  if (!hasAccess) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

  const existing = await prisma.closedDate.findUnique({
    where: { id: dateId },
    select: { placeId: true },
  });

  if (!existing || existing.placeId !== placeId) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  await prisma.closedDate.delete({ where: { id: dateId } });

  return NextResponse.json({ success: true });
}
