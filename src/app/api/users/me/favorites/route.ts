import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

// ── GET /api/users/me/favorites ──────────────────────────────────────────────

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { favoriteLocationIds: true },
  });

  return NextResponse.json({ success: true, data: user?.favoriteLocationIds ?? [] });
}

// ── POST /api/users/me/favorites — add a location to favorites ───────────────

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { locationId } = await req.json() as { locationId: string };
  if (!locationId) return NextResponse.json({ success: false, error: 'locationId required' }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { favoriteLocationIds: true },
  });

  if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });

  if (!user.favoriteLocationIds.includes(locationId)) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { favoriteLocationIds: { push: locationId } },
    });
  }

  return NextResponse.json({ success: true });
}

// ── DELETE /api/users/me/favorites?locationId= — remove from favorites ───────

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const locationId = req.nextUrl.searchParams.get('locationId');
  if (!locationId) return NextResponse.json({ success: false, error: 'locationId required' }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { favoriteLocationIds: true },
  });

  if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });

  await prisma.user.update({
    where: { id: session.user.id },
    data: { favoriteLocationIds: user.favoriteLocationIds.filter((id) => id !== locationId) },
  });

  return NextResponse.json({ success: true });
}
