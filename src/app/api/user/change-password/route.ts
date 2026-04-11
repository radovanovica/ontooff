import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

const schema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain uppercase letter')
      .regex(/[0-9]/, 'Must contain a number'),
    confirmPassword: z.string().min(1),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export async function POST(req: NextRequest) {
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

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || !user.password) {
    return NextResponse.json(
      { success: false, error: 'Cannot change password for accounts using social login.' },
      { status: 400 }
    );
  }

  const isValid = await bcrypt.compare(result.data.currentPassword, user.password);
  if (!isValid) {
    return NextResponse.json({ success: false, error: 'Current password is incorrect.' }, { status: 400 });
  }

  const hashed = await bcrypt.hash(result.data.newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

  return NextResponse.json({ success: true, message: 'Password changed successfully.' });
}
