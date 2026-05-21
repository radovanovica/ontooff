import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  sendReservationReminder,
  sendReviewRequest,
  sendComeBackEmail,
  type PlaceBranding,
} from '@/lib/email';

// ── Security ──────────────────────────────────────────────────────────────────
// Set CRON_SECRET env var and pass it as:  Authorization: Bearer <CRON_SECRET>
// On Heroku Scheduler call:  curl -X POST $APP_URL/api/cron/emails \
//                                  -H "Authorization: Bearer $CRON_SECRET"

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get('authorization') ?? '';
  return auth === `Bearer ${secret}`;
}

// ── Place select fragment (reused by all jobs) ────────────────────────────────
const placeSelect = {
  name: true,
  slug: true,
  logoUrl: true,
  phone: true,
  website: true,
  facebookUrl: true,
  instagramUrl: true,
  twitterUrl: true,
  tiktokUrl: true,
  youtubeUrl: true,
  linkedinUrl: true,
} as const;

function buildBranding(p: {
  name: string;
  logoUrl?: string | null;
  phone?: string | null;
  website?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  twitterUrl?: string | null;
  tiktokUrl?: string | null;
  youtubeUrl?: string | null;
  linkedinUrl?: string | null;
}): PlaceBranding {
  return {
    name: p.name,
    logoUrl: p.logoUrl,
    color: null,
    phone: p.phone,
    website: p.website,
    facebookUrl: p.facebookUrl,
    instagramUrl: p.instagramUrl,
    twitterUrl: p.twitterUrl,
    tiktokUrl: p.tiktokUrl,
    youtubeUrl: p.youtubeUrl,
    linkedinUrl: p.linkedinUrl,
  };
}

// ── Job 1: Reservation Reminder ───────────────────────────────────────────────
// Sends to CONFIRMED/PENDING guests whose activity starts in 1–3 days.
async function runReminderJob() {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() + 1); // tomorrow
  const to = new Date(now);
  to.setDate(to.getDate() + 3); // 3 days out

  const registrations = await prisma.registration.findMany({
    where: {
      status: { in: ['CONFIRMED', 'PENDING'] },
      startDate: { gte: from, lte: to },
      reminderSentAt: null,
    },
    include: {
      activityLocation: { include: { place: { select: placeSelect } } },
      event: { include: { place: { select: placeSelect } } },
    },
  });

  let sent = 0;
  for (const reg of registrations) {
    const place = reg.activityLocation?.place ?? reg.event?.place;
    if (!place) continue;

    const diffMs = reg.startDate.getTime() - now.getTime();
    const daysUntil = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));

    try {
      await sendReservationReminder(reg.email, {
        registrationNumber: reg.registrationNumber,
        firstName: reg.firstName,
        activityName: reg.activityLocation
          ? 'your activity'
          : (reg.event?.title ?? 'your activity'),
        locationName: reg.activityLocation?.name ?? reg.event?.title ?? '',
        startDate: reg.startDate.toLocaleDateString('en-GB'),
        daysUntil,
        editToken: reg.editToken,
        place: buildBranding(place),
      });

      await prisma.registration.update({
        where: { id: reg.id },
        data: { reminderSentAt: new Date() },
      });
      sent++;
    } catch (err) {
      console.error(`[cron/emails] reminder failed for reg ${reg.id}:`, err);
    }
  }

  return sent;
}

// ── Job 2: Review Request ─────────────────────────────────────────────────────
// Sends to COMPLETED guests whose activity ended 1–3 days ago, no review yet.
async function runReviewJob() {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 3);
  const to = new Date(now);
  to.setDate(to.getDate() - 1);

  const registrations = await prisma.registration.findMany({
    where: {
      status: 'COMPLETED',
      endDate: { gte: from, lte: to },
      reviewRequestSentAt: null,
      review: null, // no review yet
    },
    include: {
      activityLocation: { include: { place: { select: placeSelect } } },
      event: { include: { place: { select: placeSelect } } },
    },
  });

  let sent = 0;
  for (const reg of registrations) {
    const place = reg.activityLocation?.place ?? reg.event?.place;
    if (!place) continue;

    try {
      await sendReviewRequest(reg.email, {
        firstName: reg.firstName,
        activityName: reg.activityLocation
          ? 'your activity'
          : (reg.event?.title ?? 'your activity'),
        placeSlug: place.slug,
        editToken: reg.editToken,
        place: buildBranding(place),
      });

      await prisma.registration.update({
        where: { id: reg.id },
        data: { reviewRequestSentAt: new Date() },
      });
      sent++;
    } catch (err) {
      console.error(`[cron/emails] review request failed for reg ${reg.id}:`, err);
    }
  }

  return sent;
}

// ── Job 3: Come Back Email ────────────────────────────────────────────────────
// Sends to guests whose most recent COMPLETED registration for a place ended
// 29–31 days ago and they have no newer registration for the same place.
async function runComeBackJob() {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 31);
  const to = new Date(now);
  to.setDate(to.getDate() - 29);

  // Find COMPLETED registrations in the 29-31 day window
  const candidates = await prisma.registration.findMany({
    where: {
      status: 'COMPLETED',
      endDate: { gte: from, lte: to },
    },
    include: {
      activityLocation: { include: { place: { select: placeSelect } } },
      event: { include: { place: { select: placeSelect } } },
    },
  });

  let sent = 0;
  // Deduplicate by email+placeId so we only send once per guest per place
  const seen = new Set<string>();

  for (const reg of candidates) {
    const place = reg.activityLocation?.place ?? reg.event?.place;
    if (!place) continue;

    const placeId = reg.activityLocation?.placeId ?? reg.event?.placeId;
    if (!placeId) continue;

    const key = `${reg.email}::${placeId}`;
    if (seen.has(key)) continue;
    seen.add(key);

    // Check there's no newer registration for the same email+place
    const newerExists = await prisma.registration.findFirst({
      where: {
        email: { equals: reg.email, mode: 'insensitive' },
        status: { notIn: ['CANCELLED'] },
        endDate: { gt: to },
        OR: [
          { activityLocation: { placeId } },
          { event: { placeId } },
        ],
      },
      select: { id: true },
    });

    if (newerExists) continue;

    try {
      await sendComeBackEmail(reg.email, {
        firstName: reg.firstName,
        placeSlug: place.slug,
        place: buildBranding(place),
      });
      sent++;
    } catch (err) {
      console.error(`[cron/emails] come-back failed for ${reg.email} / place ${placeId}:`, err);
    }
  }

  return sent;
}

// ── Handler ───────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const job = req.nextUrl.searchParams.get('job') ?? 'all';

  const results: Record<string, number> = {};

  if (job === 'reminder' || job === 'all') {
    results.reminder = await runReminderJob();
  }
  if (job === 'review' || job === 'all') {
    results.review = await runReviewJob();
  }
  if (job === 'comeback' || job === 'all') {
    results.comeback = await runComeBackJob();
  }

  console.log('[cron/emails] completed:', results);
  return NextResponse.json({ success: true, sent: results });
}
