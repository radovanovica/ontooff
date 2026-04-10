import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const registration = await prisma.registration.findFirst({
    where: {
      editToken: token,
      OR: [{ editTokenExpiresAt: null }, { editTokenExpiresAt: { gt: new Date() } }],
    },
    include: {
      activityLocation: {
        include: { place: { select: { name: true } } },
      },
      registrationSpots: {
        include: { spot: { select: { id: true, name: true, code: true } } },
      },
    },
  });

  if (!registration) {
    return NextResponse.json(
      { error: 'Registration not found or link has expired' },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true, data: registration });
}
