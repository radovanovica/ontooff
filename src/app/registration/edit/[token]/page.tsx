'use client';

import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Grid,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { CheckCircle, Edit, Cancel } from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { useTranslation } from '@/i18n/client';
import { useCurrency } from '@/lib/currency';
import StatusBadge from '@/components/ui/StatusBadge';
import Navbar from '@/components/layout/Navbar';

const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface RegistrationData {
  id: string;
  registrationNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  status: string;
  paymentStatus: string;
  totalAmount: number | null;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  activityLocation?: { name: string; place?: { name: string } };
  registrationSpots?: { spot: { name: string; code: string } }[];
}

export default function RegistrationEditPage() {
  const { t } = useTranslation('registration');
  const { formatPrice, currency } = useCurrency();
  const params = useParams<{ token: string }>();
  const token = params.token;

  // Inline helper: show converted amount when currency differs from EUR
  const CurrencyConversion = ({ amount, sourceCurrency }: { amount: number; sourceCurrency: string }) => {
    if (currency === sourceCurrency) return null;
    return (
      <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
        (≈ {formatPrice(amount, sourceCurrency)})
      </Typography>
    );
  };

  const [registration, setRegistration] = useState<RegistrationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const isConfirmed = registration?.status === 'CONFIRMED';
  const canCancel = isConfirmed && !!registration && new Date(registration.startDate) > new Date();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    fetch(`/api/registrations/by-token/${token}`)
      .then((r) => r.json())
      .then((d) => {
        const reg = d.data ?? d;
        setRegistration(reg);
        reset({
          firstName: reg.firstName,
          lastName: reg.lastName,
          email: reg.email,
          phone: reg.phone ?? '',
          address: reg.address ?? '',
          notes: reg.notes ?? '',
        });
      })
      .catch(() => setError('Registration not found or link has expired'))
      .finally(() => setLoading(false));
  }, [token, reset]);

  const onSubmit = async (data: FormValues) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/registrations/${registration!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-edit-token': token },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to save');
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch(`/api/registrations/${registration!.id}/cancel`, {
        method: 'POST',
        headers: { 'x-edit-token': token },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Failed to cancel');
      setCancelConfirmOpen(false);
      setRegistration((prev) => prev ? { ...prev, status: 'CANCELLED' } : null);
    } catch (e) {
      setCancelError(e instanceof Error ? e.message : 'Failed to cancel');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
      <Navbar />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 5, px: 2 }}>
        <Container maxWidth="sm">
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
              <CircularProgress />
            </Box>
          ) : error && !registration ? (
            <Alert severity="error">{error}</Alert>
          ) : registration ? (
            <Paper elevation={3} sx={{ borderRadius: 3, overflow: 'hidden' }}>
              {/* Header */}
              <Box
                sx={{
                  p: 3,
                  bgcolor: 'primary.main',
                  color: 'white',
                }}
              >
                <Typography variant="overline" sx={{ opacity: 0.8 }}>
                  {t('edit.title')}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>
                  {registration.registrationNumber}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
                  <StatusBadge status={registration.status} />
                  <StatusBadge status={registration.paymentStatus} />
                </Box>
              </Box>

              <Box sx={{ p: 3 }}>
                {/* Summary */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {registration.activityLocation?.place?.name} — {registration.activityLocation?.name}
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {format(new Date(registration.startDate), 'dd.MM.yyyy')} –{' '}
                    {format(new Date(registration.endDate), 'dd.MM.yyyy')}
                    <Typography component="span" variant="body2" color="text.secondary">
                      {' '}({registration.numberOfDays} {t('fields.nights')})
                    </Typography>
                  </Typography>
                  {(registration.registrationSpots?.length ?? 0) > 0 && (
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
                      {registration.registrationSpots!.map((rs, i) => (
                        <Chip key={i} label={rs.spot.name} size="small" />
                      ))}
                    </Box>
                  )}
                  {registration.totalAmount != null && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {t('pricing.total')}: <strong>€{Number(registration.totalAmount).toFixed(2)}</strong>
                      <CurrencyConversion amount={Number(registration.totalAmount)} sourceCurrency="EUR" />
                    </Typography>
                  )}
                </Box>

                <Divider sx={{ mb: 3 }} />

                {saved && (
                  <Alert icon={<CheckCircle />} severity="success" sx={{ mb: 3 }}>
                    {t('edit.saved')}
                  </Alert>
                )}
                {isConfirmed && (
                  <Alert severity="info" sx={{ mb: 3 }}>
                    {t('edit.confirmedReadOnly', 'Your booking is confirmed. Contact details are read-only.')}
                  </Alert>
                )}
                {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

                {/* Edit form */}
                <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        {...register('firstName')}
                        label={t('fields.firstName')}
                        fullWidth
                        disabled={!!isConfirmed}
                        error={!!errors.firstName}
                        helperText={errors.firstName?.message}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        {...register('lastName')}
                        label={t('fields.lastName')}
                        fullWidth
                        disabled={!!isConfirmed}
                        error={!!errors.lastName}
                        helperText={errors.lastName?.message}
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        {...register('email')}
                        label={t('fields.email')}
                        type="email"
                        fullWidth
                        disabled={!!isConfirmed}
                        error={!!errors.email}
                        helperText={errors.email?.message}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField {...register('phone')} label={t('fields.phone')} fullWidth disabled={!!isConfirmed} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField {...register('address')} label={t('fields.address')} fullWidth disabled={!!isConfirmed} />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        {...register('notes')}
                        label={t('fields.notes')}
                        fullWidth
                        disabled={!!isConfirmed}
                        multiline
                        rows={3}
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      {!isConfirmed ? (
                        <Button
                          type="submit"
                          variant="contained"
                          fullWidth
                          size="large"
                          disabled={saving}
                          startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Edit />}
                        >
                          {t('edit.save')}
                        </Button>
                      ) : canCancel ? (
                        <Button
                          variant="outlined"
                          color="error"
                          fullWidth
                          size="large"
                          onClick={() => setCancelConfirmOpen(true)}
                          startIcon={<Cancel />}
                        >
                          {t('edit.cancelReservation', 'Cancel Reservation')}
                        </Button>
                      ) : null}
                    </Grid>
                  </Grid>
                </Box>
              </Box>
            </Paper>
          ) : null}
        </Container>
      </Box>

      {/* Cancel confirmation dialog */}
      <Dialog open={cancelConfirmOpen} onClose={() => !cancelling && setCancelConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('edit.cancelConfirmTitle', 'Cancel Reservation')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('edit.cancelConfirmBody', 'Are you sure you want to cancel this reservation? This action cannot be undone.')}
          </Typography>
          {cancelError && (
            <Alert severity="error" sx={{ mt: 2 }}>{cancelError}</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelConfirmOpen(false)} disabled={cancelling}>
            {t('common.back', 'Back')}
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleCancel}
            disabled={cancelling}
            startIcon={cancelling ? <CircularProgress size={16} color="inherit" /> : <Cancel />}
          >
            {t('edit.confirmCancel', 'Yes, Cancel')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
