import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { Box, Container, Paper, Typography } from '@mui/material';
import { validateEmbedToken } from '@/lib/utils';
import { prisma } from '@/lib/prisma';
import EmbedHeader from '@/components/embed/EmbedHeader';
import EventEmbedBookingForm from '@/components/event/EventEmbedBookingForm';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const embedToken = await validateEmbedToken(token);
  if (!embedToken || !embedToken.eventId) return { title: 'Not Found' };
  const event = await prisma.placeEvent.findUnique({ where: { id: embedToken.eventId }, select: { title: true } });
  return { title: `${event?.title ?? 'Event'} — ontooff` };
}

export default async function EmbedEventPage({ params }: Props) {
  const { token } = await params;
  const embedToken = await validateEmbedToken(token);
  if (!embedToken || !embedToken.eventId) notFound();

  // Check allowed origins against Referer header
  const reqHeaders = await headers();
  const referer = reqHeaders.get('referer') ?? '';
  if (embedToken.allowedOrigins.length > 0 && referer) {
    let refHost = '';
    try { refHost = new URL(referer).hostname; } catch { /* invalid referer */ }
    const allowed = embedToken.allowedOrigins.some((o) => {
      const clean = o.trim().replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
      return clean && (refHost === clean || refHost.endsWith(`.${clean}`));
    });
    if (!allowed) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', p: 4 }}>
          <Typography color="text.secondary">This embed is not authorized for this domain.</Typography>
        </Box>
      );
    }
  }

  const event = await prisma.placeEvent.findUnique({
    where: { id: embedToken.eventId },
    include: {
      place: { select: { id: true, name: true, logoUrl: true, city: true, country: true } },
      pricingRule: {
        include: {
          pricingTiers: { orderBy: { sortOrder: 'asc' } },
        },
      },
      _count: { select: { registrations: { where: { status: { not: 'CANCELLED' } } } } },
    },
  });

  if (!event || !event.isActive) notFound();

  const serializedEvent = {
    ...event,
    pricingRule: event.pricingRule
      ? {
          ...event.pricingRule,
          pricingTiers: event.pricingRule.pricingTiers.map((t: { pricePerUnit: unknown; [k: string]: unknown }) => ({
            ...t,
            pricePerUnit: Number(t.pricePerUnit),
          })),
        }
      : null,
    eventDate: event.eventDate.toISOString(),
    reservationDeadline: event.reservationDeadline?.toISOString() ?? null,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: { xs: 3, md: 5 }, px: 2 }}>
      <Container maxWidth="sm">
        <EmbedHeader placeName={event.place.name} logoUrl={event.place.logoUrl} />
        <Paper elevation={3} sx={{ p: { xs: 3, md: 4 }, borderRadius: 3 }}>
          <EventEmbedBookingForm
            event={serializedEvent as Parameters<typeof EventEmbedBookingForm>[0]['event']}
            embedTokenId={embedToken.id}
          />
        </Paper>
      </Container>
    </Box>
  );
}
