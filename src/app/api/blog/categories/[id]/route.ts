import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@/types';

type Props = { params: Promise<{ id: string }> };

// ── DELETE /api/blog/categories/[id] ─────────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: Props) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== UserRole.SUPER_ADMIN) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const cat = await prisma.blogCategory.findUnique({ where: { id } });
  if (!cat) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  await prisma.blogCategory.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
