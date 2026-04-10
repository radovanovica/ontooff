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
  Select,
  MenuItem,
  Tooltip,
  IconButton,
} from '@mui/material';
import { OpenInNew } from '@mui/icons-material';
import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { useTranslation } from '@/i18n/client';
import StatusBadge from '@/components/ui/StatusBadge';
import { RegistrationStatus } from '@/types';

interface BookingRow {
  id: string;
  registrationNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  totalAmount: number | null;
  startDate: string;
  endDate: string;
  activityLocation?: { name: string };
}

export default function BookingsTab({ placeId }: { placeId: string }) {
  const { t } = useTranslation('owner');
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/registrations?placeId=${placeId}&pageSize=50`);
      const data = await res.json();
      setRows(data.data?.items ?? data.items ?? []);
    } catch {
      setError(t('bookings.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [placeId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStatusChange = async (id: string, status: string) => {
    await fetch(`/api/registrations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    fetchData();
  };

  if (loading) return <CircularProgress />;

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>{t('bookings.table.bookingNumber')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('bookings.table.guest')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('bookings.table.location')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('bookings.table.dates')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('bookings.table.status')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('bookings.table.amount')}</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">{t('bookings.empty')}</Typography>
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
                    <Typography variant="body2">{reg.firstName} {reg.lastName}</Typography>
                    <Typography variant="caption" color="text.secondary">{reg.email}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{reg.activityLocation?.name ?? '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {format(new Date(reg.startDate), 'dd.MM')} – {format(new Date(reg.endDate), 'dd.MM.yy')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={reg.status}
                      size="small"
                      variant="standard"
                      onChange={(e) => handleStatusChange(reg.id, e.target.value)}
                    >
                      {Object.values(RegistrationStatus).map((s) => (
                        <MenuItem key={s} value={s}>{t(`bookings.status.${s}`)}</MenuItem>
                      ))}
                    </Select>
                  </TableCell>
                  <TableCell>
                    {reg.totalAmount != null ? (
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {t('bookings.table.currency')} {Number(reg.totalAmount).toFixed(2)}
                      </Typography>
                    ) : t('bookings.table.empty')}
                  </TableCell>
                  <TableCell>
                    <Tooltip title={t('bookings.actions.view')}>
                      <IconButton size="small" href={`/owner/bookings/${reg.id}`}>
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
