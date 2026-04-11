import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/email';
import crypto from 'crypto';

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ success: false, error: 'Invalid email' }, { status: 422 });
    }

    const { email } = result.data;
    const normalizedEmail = email.toLowerCase();

    // Always respond with success to prevent email enumeration
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (user && user.isActive) {
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: token,
          passwordResetExpires: expires,
        },
      });

      await sendPasswordResetEmail(normalizedEmail, token, user.name ?? 'User').catch(console.error);
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists for that email, a reset link has been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
