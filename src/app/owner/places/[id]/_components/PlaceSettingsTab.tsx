'use client';

import { Box, Button, TextField, Grid, CircularProgress, Alert, Snackbar, Typography, Paper, IconButton, Tooltip, Avatar, Divider } from '@mui/material';
import { CloudUpload, DeleteOutlined, Map as MapIcon, AccountCircle, Image as ImageIcon } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '@/i18n/client';
import { uploadFileToS3 } from '@/lib/upload';

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

  // Profile image state
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [profileUploading, setProfileUploading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const profileFileRef = useRef<HTMLInputElement>(null);

  // Cover image state
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [coverSuccess, setCoverSuccess] = useState(false);
  const coverFileRef = useRef<HTMLInputElement>(null);

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
        setProfileImageUrl(p.logoUrl ?? null);
        setCoverImageUrl(p.coverUrl ?? null);
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
      if (!res.ok) throw new Error(t('places.errors.mapSaveFailed'));
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleMapFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setMapError(t('places.errors.mapFileTooLarge', 'Map image must be under 10 MB'));
      return;
    }
    setMapUploading(true);
    setMapError(null);
    try {
      // Detect dimensions from image
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      await new Promise<void>((resolve) => {
        img.onload = () => { resolve(); URL.revokeObjectURL(objectUrl); };
        img.onerror = () => resolve();
        img.src = objectUrl;
      });
      setMapWidth(img.naturalWidth || 1200);
      setMapHeight(img.naturalHeight || 800);

      const url = await uploadFileToS3(file, 'images/map');
      setMapImageUrl(url);
    } catch (err) {
      setMapError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setMapUploading(false);
    }
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
      setMapError(err instanceof Error ? err.message : t('common.error'));
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
      if (!res.ok) throw new Error(t('places.errors.mapSaveFailed', 'Failed to remove map'));
      setMapSuccess(true);
    } catch (err) {
      setMapError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setMapUploading(false);
    }
  };

  if (loading) return <CircularProgress />;

  // ── Shared image upload helper ──────────────────────────────────────────────
  const makeFileHandler = (
    setUrl: (v: string | null) => void,
    setUploading: (v: boolean) => void,
    setErr: (v: string | null) => void,
    folder: string,
  ) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setErr(t('places.errors.mapFileTooLarge')); return; }
    setUploading(true);
    setErr(null);
    try {
      const url = await uploadFileToS3(file, folder);
      setUrl(url);
    } catch (err) {
      setErr(err instanceof Error ? err.message : t('places.errors.uploadFailed'));
    } finally {
      setUploading(false);
    }
    e.target.value = '';
  };

  const makeSaveHandler = (
    field: string,
    url: string | null,
    setUploading: (v: boolean) => void,
    setSuccess: (v: boolean) => void,
    setErr: (v: string | null) => void,
  ) => async () => {
    setUploading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/places/${placeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: url }),
      });
      if (!res.ok) throw new Error(t('places.errors.mapSaveFailed'));
      setSuccess(true);
    } catch (err) {
      setErr(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setUploading(false);
    }
  };

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

      <Divider sx={{ my: 4 }} />

      {/* ── Profile Image ──────────────────────────────────────────── */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <AccountCircle color="action" />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{t('places.profileImage', 'Profile Image')}</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('places.profileImageHint', 'Square logo or profile photo shown on search results and booking pages.')}
        </Typography>
        {profileError && <Alert severity="error" sx={{ mb: 2 }}>{profileError}</Alert>}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3, flexWrap: 'wrap' }}>
          {/* Preview */}
          <Avatar
            src={profileImageUrl ?? undefined}
            sx={{ width: 120, height: 120, borderRadius: 3, border: '2px solid', borderColor: 'divider', bgcolor: '#e8f5e9', cursor: 'pointer' }}
            onClick={() => profileFileRef.current?.click()}
          >
            <AccountCircle sx={{ fontSize: 60, color: 'text.disabled' }} />
          </Avatar>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pt: 1 }}>
            <Button size="small" variant="outlined" startIcon={<CloudUpload />} onClick={() => profileFileRef.current?.click()}>
              {profileImageUrl ? t('places.actions.replaceImage', 'Replace image') : t('places.actions.uploadImage', 'Upload image')}
            </Button>
            {profileImageUrl && (
              <>
                <Button
                  size="small"
                  variant="contained"
                  disabled={profileUploading}
                  onClick={makeSaveHandler('logoUrl', profileImageUrl, setProfileUploading, setProfileSuccess, setProfileError)}
                >
                  {profileUploading ? t('common.saving') : t('common.save')}
                </Button>
                <Button
                  size="small"
                  color="error"
                  startIcon={<DeleteOutlined />}
                  onClick={async () => {
                    setProfileImageUrl(null);
                    await makeSaveHandler('logoUrl', null, setProfileUploading, setProfileSuccess, setProfileError)();
                  }}
                >
                  {t('places.actions.removeImage', 'Remove')}
                </Button>
              </>
            )}
          </Box>
        </Box>
        <input ref={profileFileRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={makeFileHandler(setProfileImageUrl, setProfileUploading, setProfileError, 'images/profile')} />
        <Snackbar open={profileSuccess} autoHideDuration={3000} onClose={() => setProfileSuccess(false)} message={t('places.profileImageSaved', 'Profile image saved')} />
      </Box>

      {/* ── Cover Image ────────────────────────────────────────────── */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <ImageIcon color="action" />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{t('places.coverImage', 'Cover Image')}</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('places.coverImageHint', 'Wide banner shown at the top of your place page and in search cards.')}
        </Typography>
        {coverError && <Alert severity="error" sx={{ mb: 2 }}>{coverError}</Alert>}
        {coverImageUrl ? (
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Box sx={{ position: 'relative', mb: 2 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverImageUrl}
                alt="Cover"
                style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 8, display: 'block' }}
              />
              <Tooltip title={t('places.actions.removeImage', 'Remove')}>
                <IconButton
                  size="small"
                  color="error"
                  onClick={async () => {
                    setCoverImageUrl(null);
                    await makeSaveHandler('coverUrl', null, setCoverUploading, setCoverSuccess, setCoverError)();
                  }}
                  sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(255,255,255,0.9)', '&:hover': { bgcolor: 'white' } }}
                >
                  <DeleteOutlined fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button size="small" variant="outlined" startIcon={<CloudUpload />} onClick={() => coverFileRef.current?.click()}>
                {t('places.actions.replaceImage', 'Replace image')}
              </Button>
              <Button
                size="small"
                variant="contained"
                disabled={coverUploading}
                onClick={makeSaveHandler('coverUrl', coverImageUrl, setCoverUploading, setCoverSuccess, setCoverError)}
              >
                {coverUploading ? t('common.saving') : t('common.save')}
              </Button>
            </Box>
          </Paper>
        ) : (
          <Paper
            variant="outlined"
            sx={{ p: 4, borderRadius: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, cursor: 'pointer', borderStyle: 'dashed', '&:hover': { bgcolor: 'action.hover' } }}
            onClick={() => coverFileRef.current?.click()}
          >
            <CloudUpload sx={{ fontSize: 40, color: 'text.disabled' }} />
            <Typography variant="body2" color="text.secondary">
              {t('places.uploadCoverImageHint', 'Click to upload a cover image (JPG, PNG — max 5 MB)')}
            </Typography>
          </Paper>
        )}
        <input ref={coverFileRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={makeFileHandler(setCoverImageUrl, setCoverUploading, setCoverError, 'images/cover')} />
        <Snackbar open={coverSuccess} autoHideDuration={3000} onClose={() => setCoverSuccess(false)} message={t('places.coverImageSaved', 'Cover image saved')} />
      </Box>
    </Box>
  );
}
