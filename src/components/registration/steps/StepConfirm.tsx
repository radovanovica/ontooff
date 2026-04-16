'use client';

import {
  Box,
  Button,
  Typography,
  Alert,
  Paper,
  Divider,
  Chip,
  CircularProgress,
} from '@mui/material';
import { CheckCircle } from '@mui/icons-material';
import { useTranslation } from '@/i18n/client';
import type { PricingCalculation, RegistrationFormData } from '@/types';
import { PaymentMethod } from '@/types';
import type { LocationWithDetails, AvailableSpot } from '../types';

interface StepConfirmProps {
  formData: Partial<RegistrationFormData>;
  selectedLocation: LocationWithDetails | null;
  availableSpots: AvailableSpot[];
  numberOfDays: number;
  livePricing: PricingCalculation | null;
  summaryUsesGuestCounts: boolean;
  submitError: string | null;
  submitting: boolean;
  onBack: () => void;
  onConfirm: () => void;
  formatGuestSummary: (counts: Record<string, number>) => string;
}

export default function StepConfirm({
  formData,
  selectedLocation,
  availableSpots,
  numberOfDays,
  livePricing,
  summaryUsesGuestCounts,
  submitError,
  submitting,
  onBack,
  onConfirm,
  formatGuestSummary,
}: StepConfirmProps) {
  const { t } = useTranslation('registration');
  const { t: tc } = useTranslation('common');
  const activePricing = formData.pricing ?? livePricing;

  return (
    <Box>
      <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>{t('confirm.summaryTitle')}</Typography>

        {selectedLocation && (
          <Box sx={{ mb: 1.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{t('fields.location')}</Typography>
            <Typography variant="body2">{selectedLocation.name}</Typography>
          </Box>
        )}

        <Box sx={{ mb: 1.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{t('fields.dates')}</Typography>
          <Typography variant="body2">
            {formData.startDate} → {formData.endDate} ({numberOfDays} {t('fields.nights')})
          </Typography>
        </Box>

        {(formData.spotIds?.length ?? 0) > 0 && (
          <Box sx={{ mb: 1.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{t('fields.selectedSpots')}</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
              {availableSpots
                .filter((s) => formData.spotIds?.includes(s.id))
                .map((s) => <Chip key={s.id} label={s.name} size="small" />)}
            </Box>
          </Box>
        )}

        <Box sx={{ mb: 1.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{t('fields.contact')}</Typography>
          <Typography variant="body2">{formData.firstName} {formData.lastName}</Typography>
          <Typography variant="caption" color="text.secondary">{formData.email}</Typography>
        </Box>

        {activePricing && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{t('pricing.breakdown')}</Typography>
            {summaryUsesGuestCounts ? (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                {t('pricing.guests')}: {formatGuestSummary((formData.guestCounts ?? {}) as Record<string, number>)}
              </Typography>
            ) : (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                {tc('stepper.fixedRatePricing')}
              </Typography>
            )}
            {activePricing.breakdown?.map((item, index) => (
              <Box key={`${item.label}-${index}`} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.35 }}>
                <Box>
                  <Typography variant="body2">{item.label}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.quantity} × {activePricing.currency} {item.unitPrice.toFixed(2)}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {activePricing.currency} {item.totalPrice.toFixed(2)}
                </Typography>
              </Box>
            ))}
            <Divider sx={{ my: 1.2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle2">{t('pricing.total')}</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#2d5a27' }}>
                {activePricing.currency} {activePricing.totalAmount?.toFixed(2)}
              </Typography>
            </Box>
            {formData.paymentMethod && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary">{t('fields.paymentMethod')}: </Typography>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  {formData.paymentMethod === PaymentMethod.CASH
                    ? `💵 ${t('paymentMethods.cash')}`
                    : `💳 ${t('paymentMethods.card')}`}
                </Typography>
              </Box>
            )}
          </>
        )}

        {!activePricing && (
          <Alert severity="success" sx={{ mt: 1.5 }}>✅ {tc('stepper.noPaymentRequired')}</Alert>
        )}
      </Paper>

      {submitError && <Alert severity="error" sx={{ mb: 2 }}>{submitError}</Alert>}

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button variant="outlined" onClick={onBack} fullWidth disabled={submitting}>{t('actions.back')}</Button>
        <Button
          variant="contained"
          fullWidth
          size="large"
          onClick={onConfirm}
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <CheckCircle />}
        >
          {submitting ? t('actions.submitting') : t('actions.confirm')}
        </Button>
      </Box>
    </Box>
  );
}
