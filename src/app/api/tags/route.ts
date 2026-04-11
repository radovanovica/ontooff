import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ACTIVITY_TAGS } from '@/config/activity-tags';

export async function GET() {
  // If the table is empty (e.g. fresh Heroku deploy without seed),
  // auto-populate from the canonical config so the UI always has tags.
  const count = await prisma.activityTag.count();
  if (count === 0) {
    await prisma.activityTag.createMany({
      data: ACTIVITY_TAGS.map((t) => ({ ...t, isActive: true })),
      skipDuplicates: true,
    });
  }

  const tags = await prisma.activityTag.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  return NextResponse.json({ success: true, data: tags });
}
