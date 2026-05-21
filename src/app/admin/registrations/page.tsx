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
  TextField,
  InputAdornment,
  Tooltip,
  IconButton,
  Pagination,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Button,
} from '@mui/material';
import { Search, OpenInNew, FilterAlt, ClearAll } from '@mui/icons-material';
import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { useTranslation } from '@/i18n/client';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import Link from 'next/link';

interface RegistrationRow {
  id: string;
  registrationNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  paymentStatus: string;
  totalAmount: number | null;
  currency: string | null;
  startDate: string;
  endDate: string;
  createdAt: string;
  activityLocation?: { name: string; place?: { name: string } };
}

const STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'];

export default function AdminRegistrationsPage() {
  const { t } = useTranslation('admin');
  const [rows, setRows] = useState<RegistrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const res = await fetch(`/api/registrations?${params}`);
      const data = await res.json();
      setRows(data.data?.items ?? data.items ?? []);
      setTotal(data.data?.total ?? 0);
      setTotalPages(data.data?.totalPages ?? 1);
    } catch {
      setError(t('registrations.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, dateFrom, dateTo, page]);

  useEffect(() => {
    const timer = setTimeout(fetchData, 300);
    return () => clearTimeout(timer);
  }, [fetchData]);

  const handleReset = () => {
    setSearch('');
    setStatusFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const hasFilters = !!(search || statusFilter || dateFrom || dateTo);

  return (
    <Box>
      <PageHeader
        title={t('registrations.title')}
        breadcrumbs={[
          { label: t('dashboard.title'), href: '/admin' },
          { label: t('registrations.title') },
        ]}
      />

      {/* Filter panel */}
      <Paper elevation={1} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <FilterAlt fontSize="small" color="action" />
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {t('registrations.filters', 'Filters')}
          </Typography>
          {hasFilters && (
            <Button size="small" startIcon={<ClearAll />} onClick={handleReset} sx={{ ml: 'auto' }}>
              {t('common.clearAll', 'Clear all')}
            </Button>
          )}
        </Box>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder={t('registrations.searchPlaceholder', 'Search name, email, #…')}
              size="small"
              fullWidth
              slotProps={{
                input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> },
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>{t('registrations.columns.status', 'Status')}</InputLabel>
              <Select
                value={statusFilter}
                label={t('registrations.columns.status', 'Status')}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              >
                <MenuItem value="">{t('common.all', 'All')}</MenuItem>
                {STATUSES.map((s) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              label={t('registrations.dateFrom', 'Start date from')}
              type="date"
              size="small"
              fullWidth
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              label={t('registrations.dateTo', 'Start date to')}
              type="date"
              size="small"
              fullWidth
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>
        </Grid>
        {hasFilters && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
            {t('registrations.totalCount', { count: total })}
          </Typography>
        )}
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 700 }}>{t('registrations.columns.number')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('registrations.columns.guest')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('registrations.columns.location')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('registrations.columns.dates')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('registrations.columns.status')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('registrations.columns.payment')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('registrations.columns.amount')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('common.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={32} />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">{t('common.noData')}</Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((reg) => (
                <TableRow key={reg.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                      {reg.registrationNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {reg.firstName} {reg.lastName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {reg.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {reg.activityLocation?.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {reg.activityLocation?.place?.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {format(new Date(reg.startDate), 'dd.MM')} – {format(new Date(reg.endDate), 'dd.MM.yyyy')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={reg.status} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={reg.paymentStatus} />
                  </TableCell>
                  <TableCell>
                    {reg.totalAmount != null ? (
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {reg.currency ?? 'EUR'} {Number(reg.totalAmount).toFixed(2)}
                      </Typography>
                    ) : (
                      <Typography variant="caption" color="text.secondary">—</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Tooltip title={t('registrations.actions.viewDetails')}>
                      <IconButton size="small" component={Link} href={`/admin/registrations/${reg.id}`}>
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
            {t('registrations.totalCount', { count: total })}
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
