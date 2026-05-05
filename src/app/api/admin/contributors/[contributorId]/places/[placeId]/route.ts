import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@/types';

type Props = { params: Promise<{ placeId: string; contributorId: string }> };

// ── DELETE /api/admin/contributors/[contributorId]/places/[placeId] ───────────
// Revoke contributor access to a place
export async function DELETE(req: NextRequest, { params }: Props) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== UserRole.SUPER_ADMIN) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { contributorId, placeId } = await params;

  await prisma.contributorPlaceAccess.deleteMany({
    where: { contributorId, placeId },
  });

  return NextResponse.json({ success: true });
}
