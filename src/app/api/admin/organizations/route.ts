import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@/types';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || '';
  const search = searchParams.get('search') || '';
  const page = Number(searchParams.get('page') ?? 1);
  const pageSize = Number(searchParams.get('pageSize') ?? 20);

  const where = {
    ...(status ? { status: status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { city: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.organization.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { places: true } } },
    }),
    prisma.organization.count({ where }),
  ]);

  return NextResponse.json({ success: true, data: { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) } });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { id, status, reason } = body;

  if (!id || !status) {
    return NextResponse.json({ error: 'id and status required' }, { status: 400 });
  }

  const org = await prisma.organization.findUnique({ where: { id } });
  if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

  if (status === 'APPROVED' && !org.ownerId) {
    // Check if a user with this email already exists
    let user = await prisma.user.findUnique({ where: { email: org.email } });

    let temporaryPassword: string | null = null;

    if (!user) {
      // Generate a readable temporary password (letters + numbers only, no special chars)
      const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
      const randomChar = () => CHARS[crypto.randomInt(CHARS.length)];
      temporaryPassword = Array.from({ length: 12 }, randomChar).join('');

      const hashed = await bcrypt.hash(temporaryPassword, 12);
      user = await prisma.user.create({
        data: {
          name: org.name,
          email: org.email,
          password: hashed,
          emailVerified: new Date(),
          role: UserRole.PLACE_OWNER,
          isActive: true,
          phone: org.phone,
        },
      });
    } else if (user.role !== UserRole.PLACE_OWNER && user.role !== UserRole.SUPER_ADMIN) {
      // Upgrade existing user to PLACE_OWNER
      await prisma.user.update({
        where: { id: user.id },
        data: { role: UserRole.PLACE_OWNER },
      });
    }

    // Link org to user
    const updatedOrg = await prisma.organization.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: session.user.id,
        ownerId: user.id,
      },
    });

    // Send approval email with credentials (non-blocking)
    const { sendOrgApprovedWithCredentials } = await import('@/lib/email');
    if (temporaryPassword) {
      sendOrgApprovedWithCredentials(org.email, org.name, org.name, temporaryPassword).catch(console.error);
    } else {
      // User already existed — just send standard approval email
      const { sendOrgApprovalEmail } = await import('@/lib/email');
      sendOrgApprovalEmail(org.email, org.name).catch(console.error);
    }

    return NextResponse.json({ success: true, data: updatedOrg });
  }

  // REJECTED / SUSPENDED / other status changes
  const updatedOrg = await prisma.organization.update({
    where: { id },
    data: {
      status,
    },
  });

  if (status === 'REJECTED') {
    const { sendOrgRejectionEmail } = await import('@/lib/email');
    sendOrgRejectionEmail(org.email, org.name, reason).catch(console.error);
  }

  return NextResponse.json({ success: true, data: updatedOrg });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const org = await prisma.organization.findUnique({ where: { id } });
  if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

  // Unlink places from org before deleting (keep the places themselves)
  await prisma.place.updateMany({
    where: { organizationId: id },
    data: { organizationId: null },
  });

  await prisma.organization.delete({ where: { id } });

  // Delete the linked owner account so the email can be reused
  if (org.ownerId) {
    await prisma.user.delete({ where: { id: org.ownerId } }).catch(() => {
      // User may have already been deleted or may own other resources — ignore
    });
  }

  return NextResponse.json({ success: true });
}
