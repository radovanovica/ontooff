'use client';

import { Box, Card, CardContent, CardMedia, Chip, Typography } from '@mui/material';
import { CalendarMonth, AccessTime, LocationOn, People } from '@mui/icons-material';
import NextLink from 'next/link';
import { useCurrency } from '@/lib/currency';

interface SearchEvent {
  id: string;
  title: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  imageUrl: string | null;
  maxReservations: number | null;
  isActive: boolean;
  place: { id: string; name: string; slug: string; city: string | null; country: string | null; coverUrl: string | null };
  pricingRule: { currency: string; pricingTiers: { label: string; pricePerUnit: string }[] } | null;
  _count: { registrations: number };
}

export default function EventCard({ event }: { event: SearchEvent }) {
  const { formatPrice } = useCurrency();
  const date = new Date(event.eventDate);
  const isFull = event.maxReservations != null && event._count.registrations >= event.maxReservations;
  const spotsLeft = event.maxReservations != null ? event.maxReservations - event._count.registrations : null;
  const coverImage = event.imageUrl ?? event.place.coverUrl;

  const minPrice = event.pricingRule?.pricingTiers.length
    ? Math.min(...event.pricingRule.pricingTiers.map((t) => Number(t.pricePerUnit)))
    : null;

  return (
    <NextLink href={`/events/${event.id}`} style={{ textDecoration: 'none' }}>
      <Card
        variant="outlined"
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 2,
          transition: 'box-shadow 0.2s',
          '&:hover': { boxShadow: 4 },
          cursor: 'pointer',
        }}
      >
        {coverImage && (
          <CardMedia
            component="img"
            height={140}
            image={coverImage}
            alt={event.title}
            sx={{ objectFit: 'cover' }}
          />
        )}
        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
              {event.title}
            </Typography>
            {isFull ? (
              <Chip label="Full" size="small" color="error" sx={{ flexShrink: 0 }} />
            ) : spotsLeft != null && spotsLeft <= 5 ? (
              <Chip label={`${spotsLeft} left`} size="small" color="warning" sx={{ flexShrink: 0 }} />
            ) : null}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CalendarMonth fontSize="small" color="action" />
            <Typography variant="caption">
              {date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </Typography>
            <AccessTime fontSize="small" color="action" sx={{ ml: 0.5 }} />
            <Typography variant="caption">{event.startTime}</Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <LocationOn fontSize="small" color="action" />
            <Typography variant="caption" color="text.secondary">
              {event.place.name}{event.place.city ? `, ${event.place.city}` : ''}
            </Typography>
          </Box>

          {event.maxReservations != null && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <People fontSize="small" color="action" />
              <Typography variant="caption" color="text.secondary">
                {event._count.registrations} / {event.maxReservations}
              </Typography>
            </Box>
          )}

          {minPrice != null && event.pricingRule && (
            <Typography variant="caption" color="primary" sx={{ fontWeight: 600, mt: 'auto' }}>
              {formatPrice(minPrice, event.pricingRule.currency)}
            </Typography>
          )}
        </CardContent>
      </Card>
    </NextLink>
  );
}
