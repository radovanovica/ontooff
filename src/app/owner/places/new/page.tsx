'use client';

import {
  Box,
  Button,
  TextField,
  Grid,
  Alert,
  CircularProgress,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Divider,
} from '@mui/material';
import { ArrowBack, ArrowForward, Map as MapIcon, SkipNext, UploadFile, Clear } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from '@/i18n/client';
import PageHeader from '@/components/ui/PageHeader';
import { uploadFileToS3 } from '@/lib/upload';

// ─── Schemas ─────────────────────────────────────────────────────────────────

const detailsSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and hyphens only'),
  description: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  timezone: z.string().default('Europe/Belgrade'),
});

const mapSchema = z.object({
  mapWidth: z.coerce.number().int().positive().optional().or(z.literal('')),
  mapHeight: z.coerce.number().int().positive().optional().or(z.literal('')),
});

type DetailsValues = z.input<typeof detailsSchema>;
type MapValues = z.input<typeof mapSchema>;

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewPlacePage() {
  const { t } = useTranslation('owner');
  const router = useRouter();

  const [activeStep, setActiveStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdPlaceId, setCreatedPlaceId] = useState<string | null>(null);
  const [mapImageUrl, setMapImageUrl] = useState<string>('');
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Step 1 form ─────────────────────────────────────────────────────────
  const {
    register: reg1,
    handleSubmit: submit1,
    formState: { errors: e1 },
    setValue: sv1,
  } = useForm<DetailsValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { timezone: 'Europe/Belgrade' },
  });

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const slug = e.target.value
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    sv1('slug', slug);
  };

  const onStep1Submit = async (data: DetailsValues) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? t('places.errors.createFailed'));
      setCreatedPlaceId((json.data ?? json).id);
      setActiveStep(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  // ── Step 2 form ─────────────────────────────────────────────────────────
  const {
    register: reg2,
    handleSubmit: submit2,
    formState: { errors: e2 },
  } = useForm<MapValues>({
    resolver: zodResolver(mapSchema),
    defaultValues: { mapWidth: 1200, mapHeight: 800 },
  });

  const onStep2Submit = async (data: MapValues) => {
    if (!createdPlaceId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/places/${createdPlaceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mapWidth: data.mapWidth === '' ? null : Number(data.mapWidth) || 1200,
          mapHeight: data.mapHeight === '' ? null : Number(data.mapHeight) || 800,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? t('places.errors.mapSaveFailed'));
      }
      router.push(`/owner/places/${createdPlaceId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  // ── Map image upload (auto-saves immediately) ────────────────────────────

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !createdPlaceId) return;
    if (file.size > 10 * 1024 * 1024) {
      setImageError(t('places.errors.imageSizeExceeded'));
      return;
    }
    setImageUploading(true);
    setImageError(null);
    try {
      const url = await uploadFileToS3(file, 'images/map');
      const res = await fetch(`/api/places/${createdPlaceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapImageUrl: url }),
      });
      if (!res.ok) throw new Error(t('places.errors.imageSaveFailed'));
      setMapImageUrl(url);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : t('places.errors.uploadFailed'));
    } finally {
      setImageUploading(false);
    }
    e.target.value = '';
  };

  const handleClearImage = async () => {
    if (!createdPlaceId) return;
    await fetch(`/api/places/${createdPlaceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mapImageUrl: null }),
    });
    setMapImageUrl('');
  };

  // ────────────────────────────────────────────────────────────────────────

  return (
    <Box>
      <PageHeader
        title={t('places.addNew')}
        breadcrumbs={[
          { label: t('dashboard.title'), href: '/owner' },
          { label: t('places.title'), href: '/owner/places' },
          { label: t('places.addNew') },
        ]}
        action={
          <Button component={Link} href="/owner/places" variant="outlined" startIcon={<ArrowBack />} size="small">
            {t('common.back')}
          </Button>
        }
      />

      {/* Stepper */}
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {[t('places.steps.details'), t('places.steps.mapSetup')].map((label, idx) => (
          <Step key={label} completed={activeStep > idx}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* ── Step 1: Place Details ───────────────────────────────────────── */}
      {activeStep === 0 && (
        <Paper elevation={2} sx={{ p: 4, maxWidth: 720, borderRadius: 2 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Box component="form" onSubmit={submit1(onStep1Submit)}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField
                  {...reg1('name')}
                  label={t('places.form.name')}
                  fullWidth
                  error={!!e1.name}
                  helperText={e1.name?.message}
                  onChange={(e) => {
                    reg1('name').onChange(e);
                    handleNameChange(e as React.ChangeEvent<HTMLInputElement>);
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  {...reg1('slug')}
                  label={t('places.form.slug')}
                  fullWidth
                  error={!!e1.slug}
                  helperText={e1.slug?.message ?? t('places.form.slugHint')}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField {...reg1('description')} label={t('places.form.description')} fullWidth multiline rows={3} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField {...reg1('address')} label={t('places.form.address')} fullWidth />
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField {...reg1('city')} label={t('places.form.city')} fullWidth />
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField {...reg1('country')} label={t('places.form.country')} fullWidth />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField {...reg1('phone')} label={t('places.form.phone')} fullWidth />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField {...reg1('email')} label={t('places.form.email')} type="email" fullWidth />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField {...reg1('timezone')} label={t('places.form.timezone')} fullWidth />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={saving}
                  endIcon={saving ? <CircularProgress size={18} color="inherit" /> : <ArrowForward />}
                >
                  {t('places.actions.continueToMap')}
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      )}

      {/* ── Step 2: Map Setup ──────────────────────────────────────────── */}
      {activeStep === 1 && createdPlaceId && (
        <Box>
          <Alert severity="success" sx={{ mb: 3 }}>
            {t('places.mapSetupSuccess')}
          </Alert>

          <Paper elevation={2} sx={{ p: 4, borderRadius: 2 }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <MapIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>{t('places.mapBackground')}</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {t('places.mapBackgroundHint')}
            </Typography>

            <Box component="form" onSubmit={submit2(onStep2Submit)}>
              <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                {imageError && (
                  <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setImageError(null)}>{imageError}</Alert>
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  {mapImageUrl ? (
                    <Box sx={{ width: 96, height: 64, borderRadius: 1, overflow: 'hidden', border: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={mapImageUrl} alt="map preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </Box>
                  ) : (
                    <Box sx={{ width: 96, height: 64, borderRadius: 1, border: '1px dashed', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, bgcolor: 'action.hover' }}>
                      <MapIcon sx={{ color: 'text.disabled', fontSize: 28 }} />
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
                    <Button
                      variant="outlined"
                      startIcon={imageUploading ? <CircularProgress size={16} color="inherit" /> : <UploadFile />}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={imageUploading}
                      size="small"
                    >
                      {mapImageUrl ? t('places.actions.replaceImage') : t('places.actions.uploadImage')}
                    </Button>
                    {mapImageUrl && (
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<Clear />}
                        onClick={handleClearImage}
                        disabled={imageUploading}
                        size="small"
                      >
                        {t('places.actions.removeImage')}
                      </Button>
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {t('places.imageRequirements')}
                  </Typography>
                </Box>
              </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    {...reg2('mapWidth')}
                    label={t('locations.form.mapWidth')}
                    type="number"
                    fullWidth
                    error={!!e2.mapWidth}
                    helperText={e2.mapWidth?.message ?? t('places.defaults.mapWidth')}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    {...reg2('mapHeight')}
                    label={t('locations.form.mapHeight')}
                    type="number"
                    fullWidth
                    error={!!e2.mapHeight}
                    helperText={e2.mapHeight?.message ?? t('places.defaults.mapHeight')}
                  />
                </Grid>


              </Grid>

              <Divider sx={{ my: 3 }} />

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<SkipNext />}
                  onClick={() => router.push(`/owner/places/${createdPlaceId}`)}
                >
                  Skip — I&apos;ll do this later
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={saving}
                  startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <MapIcon />}
                >
                  Save Map &amp; Go to Place
                </Button>
              </Box>
            </Box>
          </Paper>
        </Box>
      )}
    </Box>
  );
}
