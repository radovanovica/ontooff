import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@/types';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const [
    totalUsers,
    totalPlaces,
    totalRegistrations,
    pendingRegistrations,
    confirmedRegistrations,
    recentRegistrations,
    revenueResult,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.place.count({ where: { isActive: true } }),
    prisma.registration.count(),
    prisma.registration.count({ where: { status: 'PENDING' } }),
    prisma.registration.count({ where: { status: 'CONFIRMED' } }),
    prisma.registration.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        activityLocation: {
          include: {
            activityTypes: { include: { activityType: { select: { name: true } } } },
            place: { select: { name: true } },
          },
        },
      },
    }),
    prisma.registration.aggregate({
      where: { paymentStatus: 'PAID' },
      _sum: { totalAmount: true },
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      totalUsers,
      totalPlaces,
      totalRegistrations,
      pendingRegistrations,
      confirmedRegistrations,
      totalRevenue: Number(revenueResult._sum.totalAmount ?? 0),
      recentRegistrations,
    },
  });
}
