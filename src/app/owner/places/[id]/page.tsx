'use client';

import {
  Box,
  Tabs,
  Tab,
  Typography,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslation } from '@/i18n/client';
import PageHeader from '@/components/ui/PageHeader';
import PlaceSettingsTab from './_components/PlaceSettingsTab';
import LocationsTab from './_components/LocationsTab';
import ActivityTypesTab from './_components/ActivityTypesTab';
import EmbedTokensTab from './_components/EmbedTokensTab';
import BookingsTab from './_components/BookingsTab';
import ReviewsTab from './_components/ReviewsTab';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}
function TabPanel({ children, value, index }: TabPanelProps) {
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null;
}

export default function PlaceDetailPage() {
  const { t } = useTranslation('owner');
  const params = useParams<{ id: string }>();
  const placeId = params.id;
  const [tab, setTab] = useState(0);
  const [place, setPlace] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/places/${placeId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error(d.error ?? t('places.errors.loadFailed'));
        setPlace(d.data);
      })
      .catch((e) => setError(e.message ?? t('places.errors.loadFailed')))
      .finally(() => setLoading(false));
  }, [placeId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !place) {
    return <Alert severity="error">{error ?? t('places.errors.notFound')}</Alert>;
  }

  return (
    <Box>
      <PageHeader
        title={place.name}
        breadcrumbs={[
          { label: t('dashboard.title'), href: '/owner' },
          { label: t('places.title'), href: '/owner/places' },
          { label: place.name },
        ]}
        action={
          <Button component={Link} href="/owner/places" variant="outlined" startIcon={<ArrowBack />} size="small">
            {t('common.back')}
          </Button>
        }
      />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tab label={t('places.editPlace')} />
        <Tab label={t('activityTypes.title')} />
        <Tab label={t('locations.title')} />
        <Tab label={t('embedTokens.title')} />
        <Tab label={t('bookings.title')} />
        <Tab label={t('reviews.tabLabel')} />
      </Tabs>

      <TabPanel value={tab} index={0}>
        <PlaceSettingsTab placeId={placeId} />
      </TabPanel>
      <TabPanel value={tab} index={1}>
         <ActivityTypesTab placeId={placeId} />
      </TabPanel>
      <TabPanel value={tab} index={2}>
        <LocationsTab placeId={placeId} />
      </TabPanel>
      <TabPanel value={tab} index={3}>
        <EmbedTokensTab placeId={placeId} />
      </TabPanel>
      <TabPanel value={tab} index={4}>
        <BookingsTab placeId={placeId} />
      </TabPanel>
      <TabPanel value={tab} index={5}>
        <ReviewsTab placeId={placeId} />
      </TabPanel>
    </Box>
  );
}
