import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@/types';

// ── GET /api/contributor/places ───────────────────────────────────────────────
// Returns places this contributor has been granted access to write about
export async function GET() {
  const session = await getServerSession(authOptions);
  if (
    !session?.user ||
    (session.user.role !== UserRole.CONTRIBUTOR && session.user.role !== UserRole.SUPER_ADMIN)
  ) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // Admin sees all places
  if (session.user.role === UserRole.SUPER_ADMIN) {
    const places = await prisma.place.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true, city: true, country: true, coverUrl: true },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ success: true, data: places });
  }

  const access = await prisma.contributorPlaceAccess.findMany({
    where: { contributorId: session.user.id },
    include: {
      place: { select: { id: true, name: true, slug: true, city: true, country: true, coverUrl: true } },
    },
  });

  return NextResponse.json({ success: true, data: access.map((a) => a.place) });
}
