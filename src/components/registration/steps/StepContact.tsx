'use client';

import { Box, Button, TextField, Grid, InputAdornment } from '@mui/material';
import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { useTranslation } from '@/i18n/client';
import type { Step3Values } from '../types';

interface StepContactProps {
  register: UseFormRegister<Step3Values>;
  errors: FieldErrors<Step3Values>;
  onFormSubmit: React.FormEventHandler<HTMLFormElement>;
  onBack: () => void;
}

export default function StepContact({ register, errors, onFormSubmit, onBack }: StepContactProps) {
  const { t } = useTranslation('registration');

  return (
    <Box component="form" onSubmit={onFormSubmit}>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            {...register('firstName')}
            label={t('fields.firstName')}
            fullWidth
            error={!!errors.firstName}
            helperText={errors.firstName?.message ? t(errors.firstName.message) : undefined}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            {...register('lastName')}
            label={t('fields.lastName')}
            fullWidth
            error={!!errors.lastName}
            helperText={errors.lastName?.message ? t(errors.lastName.message) : undefined}
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField
            {...register('email')}
            label={t('fields.email')}
            type="email"
            fullWidth
            error={!!errors.email}
            helperText={errors.email?.message ? t(errors.email.message) : undefined}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            {...register('phone')}
            label={t('fields.phone')}
            fullWidth
            slotProps={{ input: { startAdornment: <InputAdornment position="start">📞</InputAdornment> } }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField {...register('address')} label={t('fields.address')} fullWidth />
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button variant="outlined" onClick={onBack} fullWidth>{t('actions.back')}</Button>
        <Button type="submit" variant="contained" fullWidth size="large">{t('actions.continue')}</Button>
      </Box>
    </Box>
  );
}
