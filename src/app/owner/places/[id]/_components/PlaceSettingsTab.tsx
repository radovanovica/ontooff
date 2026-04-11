'use client';

import { Box, Button, TextField, Grid, CircularProgress, Alert, Snackbar, Typography, Paper, IconButton, Tooltip } from '@mui/material';
import { CloudUpload, DeleteOutlined, Map as MapIcon } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useRef, useState } from 'react';
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

  // Map image state
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null);
  const [mapWidth, setMapWidth] = useState<number>(1200);
  const [mapHeight, setMapHeight] = useState<number>(800);
  const [mapUploading, setMapUploading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapSuccess, setMapSuccess] = useState(false);
  const mapFileRef = useRef<HTMLInputElement>(null);

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
        setMapImageUrl(p.mapImageUrl ?? null);
        setMapWidth(p.mapWidth ?? 1200);
        setMapHeight(p.mapHeight ?? 800);
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

  const handleMapFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setMapError(t('places.errors.mapFileTooLarge', 'Map image must be under 5 MB'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      // Detect dimensions from image
      const img = new Image();
      img.onload = () => {
        setMapWidth(img.naturalWidth || 1200);
        setMapHeight(img.naturalHeight || 800);
      };
      img.src = dataUrl;
      setMapImageUrl(dataUrl);
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const saveMapImage = async () => {
    setMapUploading(true);
    setMapError(null);
    try {
      const res = await fetch(`/api/places/${placeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapImageUrl, mapWidth, mapHeight }),
      });
      if (!res.ok) throw new Error(t('places.errors.mapSaveFailed', 'Failed to save map'));
      setMapSuccess(true);
    } catch (err) {
      setMapError(err instanceof Error ? err.message : 'Error');
    } finally {
      setMapUploading(false);
    }
  };

  const removeMapImage = async () => {
    setMapImageUrl(null);
    setMapUploading(true);
    setMapError(null);
    try {
      const res = await fetch(`/api/places/${placeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapImageUrl: null }),
      });
      if (!res.ok) throw new Error('Failed to remove map');
      setMapSuccess(true);
    } catch (err) {
      setMapError(err instanceof Error ? err.message : 'Error');
    } finally {
      setMapUploading(false);
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box>
      {/* ── General Settings Form ───────────────────────────────────── */}
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

      {/* ── Map Image Section ───────────────────────────────────────── */}
      <Box sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <MapIcon color="action" />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{t('places.mapBackground', 'Map Background')}</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('places.mapBackgroundHint', 'Upload an aerial photo or illustrated map of your place. Location zones will be marked on top of this image.')}
        </Typography>

        {mapError && <Alert severity="error" sx={{ mb: 2 }}>{mapError}</Alert>}

        {mapImageUrl ? (
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Box sx={{ position: 'relative', mb: 2 }}>
              {/* Preview */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mapImageUrl}
                alt="Place map"
                style={{ width: '100%', maxHeight: 400, objectFit: 'contain', borderRadius: 8, display: 'block', background: '#f0ebe3' }}
              />
              <Tooltip title="Remove map image">
                <IconButton
                  size="small"
                  color="error"
                  onClick={removeMapImage}
                  sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(255,255,255,0.9)', '&:hover': { bgcolor: 'white' } }}
                >
                  <DeleteOutlined fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Typography variant="caption" color="text.secondary">
                {mapWidth} × {mapHeight} px
              </Typography>
              <Button
                size="small"
                variant="outlined"
                startIcon={<CloudUpload />}
                onClick={() => mapFileRef.current?.click()}
              >
                {t('places.replaceMap', 'Replace image')}
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={saveMapImage}
                disabled={mapUploading}
              >
                {mapUploading ? t('common.saving') : t('common.save')}
              </Button>
            </Box>
          </Paper>
        ) : (
          <Paper
            variant="outlined"
            sx={{
              p: 4,
              borderRadius: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1.5,
              cursor: 'pointer',
              borderStyle: 'dashed',
              '&:hover': { bgcolor: 'action.hover' },
            }}
            onClick={() => mapFileRef.current?.click()}
          >
            <CloudUpload sx={{ fontSize: 40, color: 'text.disabled' }} />
            <Typography variant="body2" color="text.secondary">
              {t('places.uploadMapHint', 'Click to upload a map image (JPG, PNG — max 5 MB)')}
            </Typography>
          </Paper>
        )}

        <input
          ref={mapFileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleMapFileChange}
        />
        <Snackbar open={mapSuccess} autoHideDuration={3000} onClose={() => setMapSuccess(false)} message={t('places.mapSaved', 'Map image saved')} />
      </Box>
    </Box>
  );
}
