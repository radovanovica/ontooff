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
  Chip,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  Tooltip,
  IconButton,
  Pagination,
} from '@mui/material';
import { Search, OpenInNew } from '@mui/icons-material';
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
  startDate: string;
  endDate: string;
  createdAt: string;
  activityLocation?: { name: string; place?: { name: string } };
}

export default function AdminRegistrationsPage() {
  const { t } = useTranslation('admin');
  const [rows, setRows] = useState<RegistrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (search) params.set('search', search);
      const res = await fetch(`/api/registrations?${params}`);
      const data = await res.json();
      setRows(data.data?.items ?? data.items ?? []);
      setTotal(data.data?.total ?? 0);
      setTotalPages(data.data?.totalPages ?? 1);
    } catch {
      setError('Failed to load registrations');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    const timer = setTimeout(fetchData, 300);
    return () => clearTimeout(timer);
  }, [fetchData]);

  return (
    <Box>
      <PageHeader
        title={t('registrations.title')}
        breadcrumbs={[
          { label: t('dashboard.title'), href: '/admin' },
          { label: t('registrations.title') },
        ]}
      />

      <Box sx={{ mb: 3 }}>
        <TextField
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder={t('registrations.searchPlaceholder')}
          size="small"
          sx={{ minWidth: 280 }}
          slotProps={{
            input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> },
          }}
        />
      </Box>

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
                        €{Number(reg.totalAmount).toFixed(2)}
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
            {total} total registrations
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
