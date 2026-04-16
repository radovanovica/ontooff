'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Tooltip,
  IconButton,
  SelectChangeEvent,
  Link as MuiLink,
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { Pagination } from '@mui/material';
import { useTranslation } from '@/i18n/client';
import { format } from 'date-fns';
import { RegistrationStatus } from '@/types';
import PageHeader from '@/components/ui/PageHeader';

interface BookingRow {
  id: string;
  registrationNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  status: RegistrationStatus;
  totalAmount: number | null;
  startDate: string;
  endDate: string;
  createdAt: string;
  activityLocation?: { id: string; name: string; place?: { name: string } };
}

interface LocationOption {
  id: string;
  name: string;
  place: { name: string };
}

const STATUS_COLORS: Record<RegistrationStatus, 'default' | 'warning' | 'info' | 'success' | 'error'> = {
  [RegistrationStatus.PENDING]: 'warning',
  [RegistrationStatus.CONFIRMED]: 'info',
  [RegistrationStatus.COMPLETED]: 'default',
  [RegistrationStatus.CANCELLED]: 'error',
  [RegistrationStatus.NO_SHOW]: 'default',
};

export default function OwnerBookingsPage() {
  const { t } = useTranslation('owner');

  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const PAGE_SIZE = 20;

  const loadLocations = useCallback(async () => {
    try {
      const res = await fetch('/api/activity-locations');
      if (res.ok) {
        const data = await res.json();
        setLocations(data.data ?? []);
      }
    } catch {
      // silently fail – locations list is non-critical
    }
  }, []);

  const loadBookings = useCallback(async (p = page) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ pageSize: String(PAGE_SIZE), page: String(p) });
      if (locationFilter) params.set('activityLocationId', locationFilter);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/registrations?${params.toString()}`);
      if (!res.ok) throw new Error(t('bookings.errors.fetchFailed'));
      const data = await res.json();
      setBookings(data.data?.items ?? data.items ?? []);
      setTotal(data.data?.total ?? 0);
      setTotalPages(data.data?.totalPages ?? 1);
    } catch {
      setError(t('bookings.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [locationFilter, statusFilter, page]);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const handleFilterChange = (setter: (v: string) => void) => (e: SelectChangeEvent) => {
    setter(e.target.value);
    setPage(1);
  };

  const handleStatusChange = async (bookingId: string, newStatus: RegistrationStatus) => {
    try {
      await fetch(`/api/registrations/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
      );
    } catch {
      setError(t('bookings.errors.updateStatusFailed'));
    }
  };

  const statuses = Object.values(RegistrationStatus) as RegistrationStatus[];

  return (
    <Box>
      <PageHeader
        title={t('bookings.title')}
        subtitle={t('bookings.subtitle')}
        breadcrumbs={[
          { label: t('dashboard.title'), href: '/owner' },
          { label: t('bookings.title') },
        ]}
        action={
          <Tooltip title={t('bookings.actions.refresh')}>
            <IconButton onClick={loadBookings}>
              <Refresh />
            </IconButton>
          </Tooltip>
        }
      />

      {/* Filters */}
      <Card elevation={1} sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>{t('bookings.filters.allLocations')}</InputLabel>
              <Select
                value={locationFilter}
                label={t('bookings.filters.allLocations')}
                onChange={handleFilterChange(setLocationFilter)}
              >
                <MenuItem value="">{t('bookings.filters.allLocations')}</MenuItem>
                {locations.map((loc) => (
                  <MenuItem key={loc.id} value={loc.id}>
                    {loc.place?.name ? `${loc.place.name} — ${loc.name}` : loc.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>{t('bookings.filters.allStatuses')}</InputLabel>
              <Select
                value={statusFilter}
                label={t('bookings.filters.allStatuses')}
                onChange={handleFilterChange(setStatusFilter)}
              >
                <MenuItem value="">{t('bookings.filters.allStatuses')}</MenuItem>
                {statuses.map((s) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t('bookings.totalCount', { count: total })}
            </Typography>
          </Box>

          <TableContainer component={Card} elevation={2}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>{t('bookings.table.bookingNumber')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('bookings.table.guest')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('bookings.table.location')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('bookings.table.checkIn')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('bookings.table.checkOut')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('bookings.table.amount')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('bookings.table.status')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('bookings.table.created')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    {t('common.noData')}
                  </TableCell>
                </TableRow>
              ) : (
                bookings.map((booking) => (
                  <TableRow key={booking.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                      <MuiLink component={Link} href={`/owner/bookings/${booking.id}`} underline="hover">
                        {booking.registrationNumber}
                      </MuiLink>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {booking.firstName} {booking.lastName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {booking.email}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{booking.activityLocation?.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {booking.activityLocation?.place?.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {booking.startDate
                        ? format(new Date(booking.startDate), 'dd MMM yyyy')
                        : t('bookings.table.empty')}
                    </TableCell>
                    <TableCell>
                      {booking.endDate
                        ? format(new Date(booking.endDate), 'dd MMM yyyy')
                        : t('bookings.table.empty')}
                    </TableCell>
                    <TableCell>
                      {booking.totalAmount != null
                        ? `${t('bookings.table.currency')} ${Number(booking.totalAmount).toFixed(2)}`
                        : t('bookings.table.empty')}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={booking.status}
                        size="small"
                        variant="standard"
                        disableUnderline
                        onChange={(e: SelectChangeEvent) =>
                          handleStatusChange(booking.id, e.target.value as RegistrationStatus)
                        }
                        renderValue={(val) => (
                          <Chip
                            label={t(`bookings.status.${val as RegistrationStatus}`)}
                            size="small"
                            color={STATUS_COLORS[val as RegistrationStatus]}
                          />
                        )}
                        sx={{ minWidth: 120 }}
                      >
                        {statuses.map((s) => (
                          <MenuItem key={s} value={s}>{t(`bookings.status.${s}`)}</MenuItem>
                        ))}
                      </Select>
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                      {format(new Date(booking.createdAt), 'dd MMM yyyy')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, p) => { setPage(p); loadBookings(p); }}
              color="primary"
              shape="rounded"
            />
          </Box>
        )}
        </>
      )}
    </Box>
  );
}
