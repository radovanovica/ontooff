'use client';

import {
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Typography,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import { Add, Settings } from '@mui/icons-material';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/i18n/client';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';

interface PlaceData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  city: string | null;
  country: string | null;
  isActive: boolean;
  logoUrl: string | null;
  _count?: { activityLocations: number };
}

export default function OwnerPlacesPage() {
  const { t } = useTranslation('owner');
  const [places, setPlaces] = useState<PlaceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/places')
      .then((r) => r.json())
      .then((d) => setPlaces(d.data?.items ?? []))
      .catch(() => setError('Failed to load places'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title={t('places.title')}
        breadcrumbs={[{ label: t('dashboard.title'), href: '/owner' }, { label: t('places.title') }]}
        action={
          <Button
            component={Link}
            href="/owner/places/new"
            variant="contained"
            startIcon={<Add />}
          >
            {t('places.addNew')}
          </Button>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {places.length === 0 ? (
        <EmptyState
          title={t('dashboard.noPlaces')}
          description={t('dashboard.addFirstPlace')}
          action={
            <Button component={Link} href="/owner/places/new" variant="contained" startIcon={<Add />}>
              {t('places.addNew')}
            </Button>
          }
        />
      ) : (
        <Grid container spacing={3}>
          {places.map((place) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={place.id}>
              <Card elevation={2} sx={{ borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* Header band */}
                <Box
                  sx={{
                    height: 6,
                    background: 'linear-gradient(90deg, #2d5a27 0%, #5c8a56 100%)',
                  }}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {place.name}
                    </Typography>
                    <Chip
                      label={place.isActive ? t('common.active') : t('common.inactive')}
                      color={place.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>
                  {(place.city || place.country) && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      📍 {[place.city, place.country].filter(Boolean).join(', ')}
                    </Typography>
                  )}
                  {place.description && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {place.description}
                    </Typography>
                  )}
                  {place._count && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                      {t('places.locationsCount', { count: place._count.activityLocations })}
                    </Typography>
                  )}
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2, gap: 1 }}>
                  <Button
                    component={Link}
                    href={`/owner/places/${place.id}`}
                    variant="contained"
                    size="small"
                    startIcon={<Settings />}
                    fullWidth
                  >
                    {t('common.manage')}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
