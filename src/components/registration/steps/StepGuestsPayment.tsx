'use client';

import {
  Box,
  Button,
  Typography,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Paper,
  ToggleButtonGroup,
  ToggleButton,
  Grid,
} from '@mui/material';
import { Controller, Control } from 'react-hook-form';
import { useTranslation } from '@/i18n/client';
import type { PricingRule, PricingCalculation } from '@/types';
import { PaymentMethod } from '@/types';
import type { Step2Values } from '../types';

interface StepGuestsPaymentProps {
  control: Control<Step2Values>;
  pricingRules: PricingRule[];
  selectedRule: PricingRule | null;
  dynamicGuestFields: { key: string; label: string }[];
  isGuestCountRule: boolean;
  livePricing: PricingCalculation | null;
  guestCounts: Record<string, number>;
  step2Error: string | null;
  onFormSubmit: React.FormEventHandler<HTMLFormElement>;
  onBack: () => void;
  formatGuestSummary: (counts: Record<string, number>) => string;
}

export default function StepGuestsPayment({
  control,
  pricingRules,
  selectedRule,
  dynamicGuestFields,
  isGuestCountRule,
  livePricing,
  guestCounts,
  step2Error,
  onFormSubmit,
  onBack,
  formatGuestSummary,
}: StepGuestsPaymentProps) {
  const { t } = useTranslation('registration');
  const { t: tc } = useTranslation('common');

  return (
    <Box component="form" onSubmit={onFormSubmit}>
      {/* Guest count fields */}
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>{t('fields.guestCounts')}</Typography>

      {isGuestCountRule ? (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {dynamicGuestFields.map(({ key, label }) => (
            <Grid size={{ xs: 6, sm: 3 }} key={key}>
              <Controller
                name={`guestCounts.${key}` as `guestCounts.${string}`}
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    label={label}
                    type="number"
                    fullWidth
                    slotProps={{ htmlInput: { min: 0 } }}
                    size="small"
                  />
                )}
              />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Alert severity="info" sx={{ mb: 3 }}>{tc('stepper.fixedRatePricing')}</Alert>
      )}

      {/* Pricing rule selector */}
      {pricingRules.length > 0 && (
        <Controller
          name="pricingRuleId"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>{t('fields.pricingRule')}</InputLabel>
              <Select {...field} label={t('fields.pricingRule')}>
                {pricingRules.map((rule) => (
                  <MenuItem key={rule.id} value={rule.id}>{rule.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        />
      )}

      {/* Payment method */}
      {pricingRules.length > 0 && selectedRule?.requiresPayment && (
        <Controller
          name="paymentMethod"
          control={control}
          render={({ field }) => (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>{t('fields.paymentMethod')}</Typography>
              <ToggleButtonGroup
                value={field.value}
                exclusive
                onChange={(_, val) => val && field.onChange(val)}
                size="small"
              >
                {(selectedRule.paymentMethod === PaymentMethod.BOTH || selectedRule.paymentMethod === PaymentMethod.CASH) && (
                  <ToggleButton value={PaymentMethod.CASH}>💵 {t('paymentMethods.cash')}</ToggleButton>
                )}
                {(selectedRule.paymentMethod === PaymentMethod.BOTH || selectedRule.paymentMethod === PaymentMethod.CARD) && (
                  <ToggleButton value={PaymentMethod.CARD}>💳 {t('paymentMethods.card')}</ToggleButton>
                )}
              </ToggleButtonGroup>
            </Box>
          )}
        />
      )}

      {pricingRules.length > 0 && selectedRule && !selectedRule.requiresPayment && (
        <Alert severity="success" sx={{ mb: 2 }}>✅ {tc('stepper.noPaymentRequired')}</Alert>
      )}
      {pricingRules.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>{tc('stepper.noPricingRule')}</Alert>
      )}

      {/* Pricing breakdown */}
      {livePricing && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{t('pricing.breakdown')}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            {t('pricing.guests')}: {formatGuestSummary(guestCounts)}
          </Typography>
          {livePricing.breakdown.map((item, i) => (
            <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
              <Box>
                <Typography variant="body2">{item.label}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {item.quantity} × {livePricing.currency} {item.unitPrice.toFixed(2)}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {livePricing.currency} {item.totalPrice.toFixed(2)}
              </Typography>
            </Box>
          ))}
          <Divider sx={{ my: 1 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="subtitle2">{t('pricing.total')}</Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#2d5a27' }}>
              {livePricing.currency} {Number(livePricing.totalAmount).toFixed(2)}
            </Typography>
          </Box>
        </Paper>
      )}

      {/* Notes */}
      <Controller
        name="notes"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            label={t('fields.notes')}
            multiline
            rows={3}
            fullWidth
            sx={{ mb: 3 }}
            placeholder={t('fields.notesPlaceholder')}
          />
        )}
      />

      {/* Validation error */}
      {step2Error && <Alert severity="error" sx={{ mb: 2 }}>{step2Error}</Alert>}

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button variant="outlined" onClick={onBack} fullWidth>{t('actions.back')}</Button>
        <Button type="submit" variant="contained" fullWidth size="large">{t('actions.continue')}</Button>
      </Box>
    </Box>
  );
}
