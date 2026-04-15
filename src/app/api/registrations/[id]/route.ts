import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { UserRole, RegistrationStatus } from '@/types';
import { sendRegistrationStatusUpdate } from '@/lib/email';

const updateSchema = z.object({
  status: z.nativeEnum(RegistrationStatus).optional(),
  paymentStatus: z.enum(['UNPAID', 'PARTIALLY_PAID', 'PAID', 'REFUNDED', 'WAIVED']).optional(),
  paymentMethod: z.enum(['CASH', 'CARD', 'BOTH']).optional(),
  paymentNotes: z.string().optional(),
  paidAt: z.string().datetime().optional(),
  notes: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

async function canAccessRegistration(id: string, userId: string, role: UserRole, editToken?: string) {
  const reg = await prisma.registration.findUnique({
    where: { id },
    include: {
      activityLocation: { include: { place: { select: { ownerId: true } } } },
    },
  });
  if (!reg) return null;

  // Super admin can do everything
  if (role === UserRole.SUPER_ADMIN) return reg;
  // Place owner sees registrations for their places
  if (role === UserRole.PLACE_OWNER && reg.activityLocation.place.ownerId === userId) return reg;
  // Regular user sees their own registrations
  if (reg.userId === userId) return reg;
  // Anyone with edit token can view/edit
  if (editToken && reg.editToken === editToken) return reg;

  return null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const editToken =
    req.nextUrl.searchParams.get('editToken') ??
    req.headers.get('x-edit-token') ??
    undefined;

  if (!session && !editToken) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const reg = await canAccessRegistration(
    id,
    session?.user.id ?? '',
    session?.user.role ?? UserRole.USER,
    editToken
  );

  if (!reg) return NextResponse.json({ success: false, error: 'Not found or forbidden' }, { status: 404 });

  const full = await prisma.registration.findUnique({
    where: { id },
    include: {
      activityLocation: {
        include: {
          activityTypes: { include: { activityType: true } },
          place: { select: { id: true, name: true, slug: true } },
        },
      },
      registrationSpots: { include: { spot: true } },
      paymentBreakdown: { orderBy: { sortOrder: 'asc' } },
      pricingRule: { include: { pricingTiers: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({ success: true, data: full });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const editToken =
    req.nextUrl.searchParams.get('editToken') ??
    req.headers.get('x-edit-token') ??
    undefined;

  if (!session && !editToken) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const reg = await canAccessRegistration(
    id,
    session?.user.id ?? '',
    session?.user.role ?? UserRole.USER,
    editToken
  );

  if (!reg) return NextResponse.json({ success: false, error: 'Not found or forbidden' }, { status: 404 });

  // Edit token users can only update contact info/notes, not status
  const isTokenAccess = !session && editToken;

  const body = await req.json();
  const result = updateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ success: false, error: 'Validation failed', details: result.error.flatten().fieldErrors }, { status: 422 });
  }

  // Restrict what token-based access can change
  const updateData = isTokenAccess
    ? {
        notes: result.data.notes,
        firstName: result.data.firstName,
        lastName: result.data.lastName,
        phone: result.data.phone,
        address: result.data.address,
      }
    : {
        ...result.data,
        paidAt: result.data.paidAt ? new Date(result.data.paidAt) : undefined,
      };

  const updated = await prisma.registration.update({
    where: { id },
    data: updateData,
  });

  // Send email on status change
  if (result.data.status && result.data.status !== reg.status) {
    await sendRegistrationStatusUpdate(
      reg.email,
      reg.firstName,
      reg.registrationNumber,
      result.data.status,
      reg.editToken
    ).catch(console.error);
  }

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  await prisma.registration.delete({ where: { id } });
  return NextResponse.json({ success: true, message: 'Registration deleted' });
}
