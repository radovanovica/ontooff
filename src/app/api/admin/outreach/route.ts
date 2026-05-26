import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@/types';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || '';
  const priority = searchParams.get('priority') || '';
  const search = searchParams.get('search') || '';
  const assignedToId = searchParams.get('assignedToId') || '';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') ?? 20)));

  const where = {
    ...(status ? { status: status as 'NEW' | 'CONTACTED' | 'INTERESTED' | 'PROPOSAL_SENT' | 'CONVERTED' | 'DECLINED' | 'ARCHIVED' } : {}),
    ...(priority ? { priority } : {}),
    ...(assignedToId ? { assignedToId } : {}),
    ...(search
      ? {
          OR: [
            { businessName: { contains: search, mode: 'insensitive' as const } },
            { contactPerson: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { city: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.outreachContact.findMany({
      where,
      orderBy: [{ nextActionAt: 'asc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.outreachContact.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const {
    businessName, contactPerson, email, phone, city, country, website, instagramUrl,
    activities, status, priority, source, notes, nextActionAt, assignedToId,
  } = body;

  if (!businessName?.trim()) {
    return NextResponse.json({ error: 'businessName is required' }, { status: 400 });
  }

  const contact = await prisma.outreachContact.create({
    data: {
      businessName: businessName.trim(),
      contactPerson: contactPerson?.trim() || null,
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      city: city?.trim() || null,
      country: country?.trim() || null,
      website: website?.trim() || null,
      instagramUrl: instagramUrl?.trim() || null,
      activities: activities?.trim() || null,
      status: status || 'NEW',
      priority: priority || 'MEDIUM',
      source: source?.trim() || null,
      notes: notes?.trim() || null,
      nextActionAt: nextActionAt ? new Date(nextActionAt) : null,
      assignedToId: assignedToId || null,
    },
    include: { assignedTo: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({ success: true, data: contact }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const existing = await prisma.outreachContact.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
  }

  const allowedFields = [
    'businessName', 'contactPerson', 'email', 'phone', 'city', 'country',
    'website', 'instagramUrl', 'activities', 'status', 'priority', 'source', 'notes', 'nextActionAt',
    'assignedToId', 'convertedAt',
  ];

  const data: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in updates) {
      if (key === 'nextActionAt' || key === 'convertedAt') {
        data[key] = updates[key] ? new Date(updates[key] as string) : null;
      } else {
        data[key] = updates[key];
      }
    }
  }

  // Auto-set convertedAt when status changes to CONVERTED
  if (data.status === 'CONVERTED' && !existing.convertedAt && !data.convertedAt) {
    data.convertedAt = new Date();
  }

  const contact = await prisma.outreachContact.update({
    where: { id },
    data,
    include: { assignedTo: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({ success: true, data: contact });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const existing = await prisma.outreachContact.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
  }

  await prisma.outreachContact.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
