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
  } else {
    // Ensure removed tags (e.g. hunting) are deactivated
    const activeSlugs = ACTIVITY_TAGS.map((t) => t.slug);
    await prisma.activityTag.updateMany({
      where: { slug: { notIn: activeSlugs } },
      data: { isActive: false },
    });
    // Upsert any new tags that may have been added to the config
    for (const tag of ACTIVITY_TAGS) {
      await prisma.activityTag.upsert({
        where: { slug: tag.slug },
        update: { name: tag.name, icon: tag.icon, color: tag.color, sortOrder: tag.sortOrder, isActive: true },
        create: { ...tag, isActive: true },
      });
    }
  }

  const tags = await prisma.activityTag.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  return NextResponse.json({ success: true, data: tags });
}
