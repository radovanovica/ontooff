'use client';

import {
  Box,
  Container,
  Typography,
  Grid,
  Skeleton,
  Button,
  Paper,
} from '@mui/material';
import { Event as EventIcon } from '@mui/icons-material';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslation } from '@/i18n/client';
import EventCard from '@/components/event/EventCard';

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

export default function UpcomingEventsSection() {
  const { t } = useTranslation('common');
  const [events, setEvents] = useState<SearchEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/events?upcoming=true&pageSize=6')
      .then((r) => r.json())
      .then((d) => setEvents(d.data?.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Don't render the section at all if no events and not loading
  if (!loading && events.length === 0) return null;

  return (
    <Box sx={{ py: { xs: 8, md: 12 }, bgcolor: 'white' }}>
      <Container maxWidth="lg">
        {/* Section header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 6 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <EventIcon sx={{ color: '#2d5a27', fontSize: 28 }} />
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {t('home.upcomingEvents', 'Upcoming Events')}
              </Typography>
            </Box>
            <Typography variant="body1" color="text.secondary">
              {t('home.upcomingEventsSub', "Don't miss out on these upcoming experiences.")}
            </Typography>
          </Box>
          <Button
            component={Link}
            href="/search?tab=events"
            variant="outlined"
            size="small"
            sx={{ flexShrink: 0 }}
          >
            {t('home.viewAllEvents', 'View all events →')}
          </Button>
        </Box>

        {loading ? (
          <Grid container spacing={3}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
                <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 2 }} />
              </Grid>
            ))}
          </Grid>
        ) : events.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 5, textAlign: 'center', borderRadius: 2 }}>
            <EventIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body1" color="text.secondary">
              {t('home.noUpcomingEvents', 'No upcoming events at the moment. Check back soon!')}
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {events.map((event) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={event.id}>
                <EventCard event={event} />
              </Grid>
            ))}
          </Grid>
        )}

        {!loading && events.length > 0 && (
          <Box sx={{ textAlign: 'center', mt: 5 }}>
            <Button
              component={Link}
              href="/search?tab=events"
              variant="contained"
              size="large"
              sx={{ bgcolor: '#2d5a27', '&:hover': { bgcolor: '#1e3d1a' }, px: 5 }}
            >
              {t('home.viewAllEvents', 'View all events →')}
            </Button>
          </Box>
        )}
      </Container>
    </Box>
  );
}
