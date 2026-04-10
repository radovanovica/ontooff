'use client';

import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material';
import { OpenInNew, Add } from '@mui/icons-material';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useTranslation } from '@/i18n/client';
import PageHeader from '@/components/ui/PageHeader';

interface PlaceRow {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  isActive: boolean;
  createdAt: string;
  owner?: { name: string | null; email: string };
  _count?: { activityLocations: number; registrations: number };
}

export default function AdminPlacesPage() {
  const { t } = useTranslation('admin');
  const [places, setPlaces] = useState<PlaceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/places?pageSize=100')
      .then((r) => r.json())
      .then((d) => setPlaces(d.data?.items ?? d.items ?? []))
      .catch(() => setError('Failed to load places'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Box>
      <PageHeader
        title={t('places.title')}
        breadcrumbs={[
          { label: t('dashboard.title'), href: '/admin' },
          { label: t('places.title') },
        ]}
        action={
          <IconButton component={Link} href="/owner/places/new" color="primary" size="small">
            <Add />
          </IconButton>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 700 }}>{t('places.columns.name')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('places.columns.location')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('places.columns.owner')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('places.columns.locations')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('places.columns.registrations')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('places.columns.status')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('places.columns.created')}</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={32} />
                </TableCell>
              </TableRow>
            ) : places.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">{t('common.noData')}</Typography>
                </TableCell>
              </TableRow>
            ) : (
              places.map((place) => (
                <TableRow key={place.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{place.name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {[place.city, place.country].filter(Boolean).join(', ') || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{place.owner?.name ?? '—'}</Typography>
                    <Typography variant="caption" color="text.secondary">{place.owner?.email}</Typography>
                  </TableCell>
                  <TableCell align="center">{place._count?.activityLocations ?? 0}</TableCell>
                  <TableCell align="center">{place._count?.registrations ?? 0}</TableCell>
                  <TableCell>
                    <Chip
                      label={place.isActive ? 'Active' : 'Inactive'}
                      color={place.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {format(new Date(place.createdAt), 'dd.MM.yyyy')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Manage">
                      <IconButton size="small" component={Link} href={`/owner/places/${place.id}`}>
                        <OpenInNew fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
