import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@/types';

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  tagIds: z.array(z.string()).optional(),
});

async function getTypeAndCheckAccess(id: string, userId: string, role: UserRole) {
  const at = await prisma.activityType.findUnique({
    where: { id },
    include: { place: { select: { ownerId: true } } },
  });
  if (!at) return null;
  if (role !== UserRole.SUPER_ADMIN && at.place.ownerId !== userId) return null;
  return at;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const at = await prisma.activityType.findUnique({
    where: { id },
    include: { _count: { select: { activityLocations: true } } },
  });
  if (!at) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true, data: at });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const at = await getTypeAndCheckAccess(id, session.user.id, session.user.role);
  if (!at) return NextResponse.json({ success: false, error: 'Not found or forbidden' }, { status: 404 });

  const body = await req.json();
  const result = updateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ success: false, error: 'Validation failed', details: result.error.flatten().fieldErrors }, { status: 422 });
  }

  const { tagIds, ...updateData } = result.data;

  // Update in a transaction if tags are being changed
  const updated = await prisma.$transaction(async (tx) => {
    const record = await tx.activityType.update({ where: { id }, data: updateData });
    if (tagIds !== undefined) {
      // Replace all tags
      await tx.activityTypeTag.deleteMany({ where: { activityTypeId: id } });
      if (tagIds.length > 0) {
        await tx.activityTypeTag.createMany({
          data: tagIds.map((tagId) => ({ activityTypeId: id, tagId })),
        });
      }
    }
    return tx.activityType.findUnique({
      where: { id },
      include: { tags: { include: { tag: true } } },
    });
  });

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const at = await getTypeAndCheckAccess(id, session.user.id, session.user.role);
  if (!at) return NextResponse.json({ success: false, error: 'Not found or forbidden' }, { status: 404 });

  await prisma.activityType.delete({ where: { id } });
  return NextResponse.json({ success: true, message: 'Deleted' });
}
