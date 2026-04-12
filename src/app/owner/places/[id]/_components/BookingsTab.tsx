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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
  Stack,
  Divider,
  InputLabel,
  FormControl,
  Snackbar,
} from '@mui/material';
import { OpenInNew, Add } from '@mui/icons-material';
import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { useTranslation } from '@/i18n/client';
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

interface ActivityLocation {
  id: string;
  name: string;
  activityType: { name: string };
}

interface ManualBookingForm {
  activityLocationId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  startDate: string;
  endDate: string;
  adults: number;
  notes: string;
  initialStatus: 'PENDING' | 'CONFIRMED';
  sendConfirmation: boolean;
}

const EMPTY_FORM: ManualBookingForm = {
  activityLocationId: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  startDate: '',
  endDate: '',
  adults: 1,
  notes: '',
  initialStatus: 'CONFIRMED',
  sendConfirmation: false,
};

export default function BookingsTab({ placeId }: { placeId: string }) {
  const { t } = useTranslation('owner');
  const { t: tReg } = useTranslation('registration');
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Manual booking dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [locations, setLocations] = useState<ActivityLocation[]>([]);
  const [form, setForm] = useState<ManualBookingForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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

  // Fetch locations once for the dialog
  useEffect(() => {
    fetch(`/api/places/${placeId}`)
      .then((r) => r.json())
      .then((d) => setLocations(d.data?.activityLocations ?? []))
      .catch(() => {/* silent */});
  }, [placeId]);

  const handleStatusChange = async (id: string, status: string) => {
    await fetch(`/api/registrations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    fetchData();
  };

  const handleOpenDialog = () => {
    setForm(EMPTY_FORM);
    setFormError(null);
    setDialogOpen(true);
  };

  const handleField = (field: keyof ManualBookingForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = field === 'adults' ? Number(e.target.value) : e.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
    };

  const handleSubmit = async () => {
    setFormError(null);
    if (!form.activityLocationId) { setFormError(t('bookings.manual.selectLocation')); return; }
    if (!form.firstName || !form.lastName || !form.email) { setFormError('Please fill in all required fields.'); return; }
    if (!form.startDate || !form.endDate) { setFormError('Please select start and end dates.'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityLocationId: form.activityLocationId,
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone || undefined,
          startDate: form.startDate,
          endDate: form.endDate,
          guestCounts: { adults: form.adults },
          notes: form.notes || undefined,
          initialStatus: form.initialStatus,
          sendConfirmation: form.sendConfirmation,
          source: 'MANUAL',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? 'Error creating booking');
        return;
      }
      setDialogOpen(false);
      setSuccessMsg(t('bookings.manual.success'));
      fetchData();
    } catch {
      setFormError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Header row with Add Booking button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleOpenDialog}
        >
          {t('bookings.addNew')}
        </Button>
      </Box>

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

      {/* Manual Booking Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h6">{t('bookings.manual.title')}</Typography>
          <Typography variant="body2" color="text.secondary">{t('bookings.manual.subtitle')}</Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            {formError && <Alert severity="error">{formError}</Alert>}

            {/* Location */}
            <FormControl fullWidth size="small" required>
              <InputLabel>{t('bookings.table.location')}</InputLabel>
              <Select
                value={form.activityLocationId}
                label={t('bookings.table.location')}
                onChange={(e) => setForm((prev) => ({ ...prev, activityLocationId: e.target.value }))}
              >
                {locations.map((loc) => (
                  <MenuItem key={loc.id} value={loc.id}>
                    {loc.name} — {loc.activityType.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Divider />

            {/* Guest info */}
            <Stack direction="row" spacing={2}>
              <TextField
                label={tReg('firstName')}
                size="small"
                fullWidth
                required
                value={form.firstName}
                onChange={handleField('firstName')}
              />
              <TextField
                label={tReg('lastName')}
                size="small"
                fullWidth
                required
                value={form.lastName}
                onChange={handleField('lastName')}
              />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                label={tReg('email')}
                type="email"
                size="small"
                fullWidth
                required
                value={form.email}
                onChange={handleField('email')}
              />
              <TextField
                label={tReg('phone')}
                size="small"
                fullWidth
                value={form.phone}
                onChange={handleField('phone')}
              />
            </Stack>

            <Divider />

            {/* Dates + guests */}
            <Stack direction="row" spacing={2}>
              <TextField
                label={tReg('startDate')}
                type="date"
                size="small"
                fullWidth
                required
                value={form.startDate}
                onChange={handleField('startDate')}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label={tReg('endDate')}
                type="date"
                size="small"
                fullWidth
                required
                value={form.endDate}
                onChange={handleField('endDate')}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>
            <TextField
              label={t('bookings.manual.adults')}
              type="number"
              size="small"
              fullWidth
              value={form.adults}
              onChange={handleField('adults')}
              slotProps={{ htmlInput: { min: 1 } }}
            />

            <Divider />

            {/* Initial status */}
            <FormControl fullWidth size="small">
              <InputLabel>{t('bookings.manual.initialStatus')}</InputLabel>
              <Select
                value={form.initialStatus}
                label={t('bookings.manual.initialStatus')}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    initialStatus: e.target.value as 'PENDING' | 'CONFIRMED',
                  }))
                }
              >
                <MenuItem value="PENDING">{t('bookings.status.PENDING')}</MenuItem>
                <MenuItem value="CONFIRMED">{t('bookings.status.CONFIRMED')}</MenuItem>
              </Select>
            </FormControl>

            {/* Notes */}
            <TextField
              label={t('bookings.manual.notes')}
              size="small"
              fullWidth
              multiline
              rows={2}
              value={form.notes}
              onChange={handleField('notes')}
            />

            {/* Send confirmation email toggle */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.sendConfirmation}
                  onChange={(e) => setForm((prev) => ({ ...prev, sendConfirmation: e.target.checked }))}
                />
              }
              label={t('bookings.manual.sendConfirmation')}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={submitting}>
            {t('common.cancel') ?? 'Cancel'}
          </Button>
          <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
            {submitting ? t('bookings.manual.submitting') : t('bookings.manual.submit')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success snackbar */}
      <Snackbar
        open={!!successMsg}
        autoHideDuration={4000}
        onClose={() => setSuccessMsg(null)}
        message={successMsg}
      />
    </Box>
  );
}
