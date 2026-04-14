import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { sendOrgRegistrationEmail, sendAdminNewOrgNotification } from '@/lib/email';

const schema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  description: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: result.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const { name, email, phone, address, city, country, website, description } = result.data;
    const normalizedEmail = email.toLowerCase();

    const existing = await prisma.organization.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'An organization with this email is already registered' },
        { status: 409 }
      );
    }

    const org = await prisma.organization.create({
      data: {
        name,
        email: normalizedEmail,
        phone: phone || null,
        address: address || null,
        city: city || null,
        country: country || null,
        website: website || null,
        description: description || null,
        status: 'PENDING',
      },
    });

    // Send confirmation email to the registering org (non-blocking)
    sendOrgRegistrationEmail(normalizedEmail, name).catch(console.error);

    // Notify super admin (non-blocking)
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL ?? process.env.SMTP_USER;
    if (superAdminEmail) {
      sendAdminNewOrgNotification(superAdminEmail, {
        name,
        email: normalizedEmail,
        phone: phone || null,
        city: city || null,
        country: country || null,
        website: website || null,
        description: description || null,
      }).catch(console.error);
    }

    return NextResponse.json(
      { success: true, message: 'Organization registered! We will review your application and contact you.', id: org.id },
      { status: 201 }
    );
  } catch (error) {
    console.error('Register org error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
