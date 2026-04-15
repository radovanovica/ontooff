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
  Pagination,
  TextField,
  InputAdornment,
} from '@mui/material';
import { OpenInNew, Add, Search } from '@mui/icons-material';
import { useState, useEffect, useCallback } from 'react';
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
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 20;

  const fetchPlaces = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (search) params.set('search', search);
      const res = await fetch(`/api/places?${params}`);
      const data = await res.json();
      setPlaces(data.data?.items ?? data.items ?? []);
      setTotal(data.data?.total ?? 0);
      setTotalPages(data.data?.totalPages ?? Math.ceil((data.data?.total ?? 0) / PAGE_SIZE));
    } catch {
      setError(t('places.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    const timer = setTimeout(fetchPlaces, 300);
    return () => clearTimeout(timer);
  }, [fetchPlaces]);

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

      <Box sx={{ mb: 3 }}>
        <TextField
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder={t('places.searchPlaceholder')}
          size="small"
          sx={{ minWidth: 280 }}
          slotProps={{
            input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> },
          }}
        />
      </Box>

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
                      label={place.isActive ? t('common.active') : t('common.inactive')}
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
                    <Tooltip title={t('places.manage')}>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 3 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
            {t('places.totalCount', { count: total })}
          </Typography>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, p) => setPage(p)}
            color="primary"
            shape="rounded"
          />
        </Box>
      )}
    </Box>
  );
}
