'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Box, Button, CircularProgress } from '@mui/material';
import { useTranslation } from '@/i18n/client';

interface Props {
  bookingId: string;
  currentStatus: string;
}

export default function BookingDecisionActions({ bookingId, currentStatus }: Props) {
  const { t } = useTranslation('owner');
  const router = useRouter();
  const [loading, setLoading] = useState<false | 'CONFIRMED' | 'CANCELLED'>(false);
  const [error, setError] = useState<string | null>(null);

  const updateStatus = async (status: 'CONFIRMED' | 'CANCELLED') => {
    setLoading(status);
    setError(null);
    try {
      const res = await fetch(`/api/registrations/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? t('bookings.errors.updateStatusFailed'));
      }

      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('bookings.errors.updateStatusFailed'));
    } finally {
      setLoading(false);
    }
  };

  const isConfirmed = currentStatus === 'CONFIRMED';
  const isRejected = currentStatus === 'CANCELLED';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant={isConfirmed ? 'contained' : 'outlined'}
          color="success"
          disabled={!!loading || isConfirmed}
          onClick={() => updateStatus('CONFIRMED')}
          startIcon={loading === 'CONFIRMED' ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {isConfirmed ? t('bookings.actions.confirmed') : t('bookings.actions.confirm')}
        </Button>
        <Button
          variant={isRejected ? 'contained' : 'outlined'}
          color="error"
          disabled={!!loading || isRejected}
          onClick={() => updateStatus('CANCELLED')}
          startIcon={loading === 'CANCELLED' ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {isRejected ? t('bookings.actions.rejected') : t('bookings.actions.reject')}
        </Button>
      </Box>
      {error && (
        <Alert severity="error" sx={{ width: '100%', maxWidth: 420 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
}
