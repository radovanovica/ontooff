import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

const schema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  image: z.string().url().optional().or(z.literal('')),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, phone: true, image: true, role: true, createdAt: true, emailVerified: true },
  });

  if (!user) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true, data: user });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const result = schema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: 'Validation failed', details: result.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { name, phone, image } = result.data;

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(name !== undefined && { name }),
      ...(phone !== undefined && { phone }),
      ...(image !== undefined && { image: image || null }),
    },
    select: { id: true, name: true, email: true, phone: true, image: true, role: true },
  });

  return NextResponse.json({ success: true, data: updated });
}
