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
import EmptyState from '@/components/ui/EmptyState';

interface LocationData {
  id: string;
  name: string;
  description: string | null;
  requiresSpot: boolean;
  maxCapacity: number | null;
  isActive: boolean;
  activityTypes: Array<{ activityType: { name: string; icon: string | null; color: string | null } }>;
  _count?: { spots: number };
}

export default function LocationsTab({ placeId }: { placeId: string }) {
  const { t } = useTranslation('owner');
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/activity-locations?placeId=${placeId}`)
      .then((r) => r.json())
      .then((d) => setLocations(d.data ?? []))
      .catch(() => setError('Failed to load locations'))
      .finally(() => setLoading(false));
  }, [placeId]);

  if (loading) return <CircularProgress />;

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
        <Button
          component={Link}
          href={`/owner/places/${placeId}/locations/new`}
          variant="contained"
          startIcon={<Add />}
        >
          {t('locations.addNew')}
        </Button>
      </Box>

      {locations.length === 0 ? (
        <EmptyState
          title={t('locations.title')}
          description=""
          action={
            <Button component={Link} href={`/owner/places/${placeId}/locations/new`} variant="contained" startIcon={<Add />}>
              {t('locations.addNew')}
            </Button>
          }
        />
      ) : (
        <Grid container spacing={2}>
          {locations.map((loc) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={loc.id}>
              <Card elevation={1} sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    {loc.activityTypes[0]?.activityType.icon && (
                      <Typography sx={{ fontSize: '1.25rem' }}>{loc.activityTypes[0].activityType.icon}</Typography>
                    )}
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {loc.name}
                    </Typography>
                    <Chip
                      label={loc.isActive ? 'Active' : 'Inactive'}
                      color={loc.isActive ? 'success' : 'default'}
                      size="small"
                      sx={{ ml: 'auto' }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1, mx:1 }}>
                    {loc.activityTypes.map(({ activityType: at }) => (
                      <Chip key={at.name} label={at.name} size="small" variant="outlined" />
                    ))}
                  </Box>
                  {loc.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {loc.description}
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {loc._count && (
                      <Typography variant="caption" color="text.secondary">
                        {loc._count.spots} spots
                      </Typography>
                    )}
                    {loc.maxCapacity && (
                      <Typography variant="caption" color="text.secondary">
                        · Max {loc.maxCapacity} persons
                      </Typography>
                    )}
                  </Box>
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2 }}>
                  <Button
                    component={Link}
                    href={`/owner/places/${placeId}/locations/${loc.id}`}
                    variant="outlined"
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
