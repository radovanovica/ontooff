'use client';

import { Box, Button, TextField, Grid, CircularProgress, Alert, Snackbar } from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import { useTranslation } from '@/i18n/client';

const schema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and hyphens only'),
  description: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  timezone: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function PlaceSettingsTab({ placeId }: { placeId: string }) {
  const { t } = useTranslation('owner');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    fetch(`/api/places/${placeId}`)
      .then((r) => r.json())
      .then((d) => {
        const p = d.data ?? d;
        reset({
          name: p.name ?? '',
          slug: p.slug ?? '',
          description: p.description ?? '',
          address: p.address ?? '',
          city: p.city ?? '',
          country: p.country ?? '',
          phone: p.phone ?? '',
          email: p.email ?? '',
          website: p.website ?? '',
          timezone: p.timezone ?? 'Europe/Belgrade',
        });
      })
      .finally(() => setLoading(false));
  }, [placeId, reset]);

  const onSubmit = async (data: FormValues) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/places/${placeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Save failed');
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 8 }}>
          <TextField {...register('name')} label={t('places.form.name')} fullWidth error={!!errors.name} helperText={errors.name?.message} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField {...register('slug')} label={t('places.form.slug')} fullWidth error={!!errors.slug} helperText={errors.slug?.message} />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField {...register('description')} label={t('places.form.description')} fullWidth multiline rows={3} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField {...register('address')} label={t('places.form.address')} fullWidth />
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <TextField {...register('city')} label={t('places.form.city')} fullWidth />
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <TextField {...register('country')} label={t('places.form.country')} fullWidth />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField {...register('phone')} label={t('places.form.phone')} fullWidth />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField {...register('email')} label={t('places.form.email')} type="email" fullWidth error={!!errors.email} helperText={errors.email?.message} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField {...register('website')} label={t('places.form.website')} fullWidth />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField {...register('timezone')} label={t('places.form.timezone')} fullWidth />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        </Grid>
      </Grid>
      <Snackbar open={success} autoHideDuration={3000} onClose={() => setSuccess(false)} message={t('places.updated')} />
    </Box>
  );
}
