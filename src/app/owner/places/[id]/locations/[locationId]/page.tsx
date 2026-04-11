'use client';

import {
  Box,
  Tabs,
  Tab,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Grid,
  TextField,
  Switch,
  FormControlLabel,
  Snackbar,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
} from '@mui/material';
import { ArrowBack, Add, Delete, Edit, CloudUpload, Collections, Star, StarBorder } from '@mui/icons-material';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from '@/i18n/client';
import PageHeader from '@/components/ui/PageHeader';

// ─── Types ───────────────────────────────────────────────────────────────────

interface LocationData {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  requiresSpot: boolean;
  maxCapacity: number | null;
  mapWidth: number | null;
  mapHeight: number | null;
  mapImageUrl: string | null;
  sortOrder: number;
  gallery: string | null;           // JSON: string[]
  coverImageIndex: number | null;    // index of primary gallery image
  instructions: string | null;       // How to find the place
  activityType: { id: string; name: string; icon: string | null };
  place: { id: string; name: string };
  spots: SpotData[];
}

interface SpotData {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  maxPeople: number;
  status: string;
  amenities: string[];
  svgShapeData: string | null;
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

const locationSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  instructions: z.string().optional(),
  maxCapacity: z.coerce.number().int().positive().optional().or(z.literal('')),
  requiresSpot: z.boolean(),
  isActive: z.boolean(),
  mapWidth: z.coerce.number().int().positive().optional().or(z.literal('')),
  mapHeight: z.coerce.number().int().positive().optional().or(z.literal('')),
  sortOrder: z.coerce.number().default(0),
});

const spotSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  description: z.string().optional(),
  maxPeople: z.coerce.number().int().positive().default(1),
  status: z.enum(['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'DISABLED']).default('AVAILABLE'),
});

type LocationFormValues = z.input<typeof locationSchema>;
type SpotFormValues = z.input<typeof spotSchema>;

// ─── TabPanel ────────────────────────────────────────────────────────────────

function TabPanel({ children, value, index }: { children?: React.ReactNode; value: number; index: number }) {
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null;
}

// ─── Settings Tab ────────────────────────────────────────────────────────────

function SettingsTab({ location, locationId, onUpdated }: { location: LocationData; locationId: string; onUpdated: () => void }) {
  const { t } = useTranslation('owner');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, control, formState: { errors } } = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: location.name,
      description: location.description ?? '',
      instructions: location.instructions ?? '',
      maxCapacity: location.maxCapacity ?? undefined,
      requiresSpot: location.requiresSpot,
      isActive: location.isActive,
      mapWidth: location.mapWidth ?? undefined,
      mapHeight: location.mapHeight ?? undefined,
      sortOrder: location.sortOrder,
    },
  });

  const onSubmit = async (data: LocationFormValues) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/activity-locations/${locationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          instructions: data.instructions || undefined,
          maxCapacity: data.maxCapacity === '' ? null : Number(data.maxCapacity) || null,
          mapWidth: data.mapWidth === '' ? null : Number(data.mapWidth) || null,
          mapHeight: data.mapHeight === '' ? null : Number(data.mapHeight) || null,
        }),
      });
      if (!res.ok) throw new Error(t('locations.errors.saveFailed'));
      setSuccess(true);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 8 }}>
          <TextField
            {...register('name')}
            label={t('locations.form.name')}
            fullWidth
            error={!!errors.name}
            helperText={errors.name?.message}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            {...register('sortOrder')}
            label={t('activityTypes.sortOrder')}
            type="number"
            fullWidth
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField
            {...register('description')}
            label={t('locations.form.description')}
            fullWidth
            multiline
            rows={3}
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField
            {...register('instructions')}
            label={t('locations.form.instructions')}
            fullWidth
            multiline
            rows={4}
            placeholder={t('locations.form.instructionsPlaceholder')}
            helperText={t('locations.form.instructionsHint')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            {...register('maxCapacity')}
            label={t('locations.form.maxCapacity')}
            type="number"
            fullWidth
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            {...register('mapWidth')}
            label={t('locations.form.mapWidth')}
            type="number"
            fullWidth
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            {...register('mapHeight')}
            label={t('locations.form.mapHeight')}
            type="number"
            fullWidth
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Alert severity="info">
            {t('locations.mapManagedHint')}
          </Alert>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Controller
            name="requiresSpot"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={<Switch checked={field.value} onChange={e => field.onChange(e.target.checked)} />}
                label={t('locations.form.requiresSpot')}
              />
            )}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={<Switch checked={field.value} onChange={e => field.onChange(e.target.checked)} />}
                label={t('common.active')}
              />
            )}
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        </Grid>
      </Grid>
      <Snackbar open={success} autoHideDuration={3000} onClose={() => setSuccess(false)} message={t('locations.updated')} />
    </Box>
  );
}

// ─── Spots Tab ───────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  AVAILABLE: 'success',
  OCCUPIED: 'warning',
  MAINTENANCE: 'error',
  DISABLED: 'default',
};

function SpotsTab({
  locationId,
  spots,
  onUpdated,
}: {
  locationId: string;
  spots: SpotData[];
  onUpdated: () => void;
}) {
  const { t } = useTranslation('owner');
  const [open, setOpen] = useState(false);
  const [editSpot, setEditSpot] = useState<SpotData | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SpotFormValues>({
    resolver: zodResolver(spotSchema),
  });

  const openAdd = () => {
    setEditSpot(null);
    reset({ name: '', code: '', description: '', maxPeople: 1, status: 'AVAILABLE' });
    setOpen(true);
  };

  const openEdit = (spot: SpotData) => {
    setEditSpot(spot);
    reset({ name: spot.name, code: spot.code ?? '', description: spot.description ?? '', maxPeople: spot.maxPeople, status: spot.status as SpotFormValues['status'] });
    setOpen(true);
  };

  const onSubmit = async (data: SpotFormValues) => {
    setSaving(true);
    setError(null);
    try {
      if (editSpot) {
        const res = await fetch(`/api/spots`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editSpot.id, ...data }),
        });
        if (!res.ok) throw new Error(t('spots.errors.saveFailed'));
      } else {
        const res = await fetch('/api/spots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activityLocationId: locationId, ...data }),
        });
        if (!res.ok) throw new Error(t('spots.errors.createFailed'));
      }
      setOpen(false);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (spotId: string) => {
    if (!confirm(t('spots.deleteConfirm'))) return;
    await fetch(`/api/spots`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: spotId }),
    });
    onUpdated();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="body2" color="text.secondary">
          {t('spots.listHint')}
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={openAdd}>
          {t('spots.addNew')}
        </Button>
      </Box>
      {spots.length === 0 ? (
        <Alert severity="info">{t('spots.empty')}</Alert>
      ) : (
        <Grid container spacing={2}>
          {spots.map((spot) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={spot.id}>
              <Card elevation={1} sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, flexGrow: 1 }}>
                      {spot.name}
                      {spot.code && <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>({spot.code})</Typography>}
                    </Typography>
                    <Chip label={spot.status} color={STATUS_COLORS[spot.status] ?? 'default'} size="small" />
                  </Box>
                  {spot.description && <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{spot.description}</Typography>}
                  <Typography variant="caption" color="text.secondary">
                    {t('spots.maxPeopleLabel', { count: spot.maxPeople })}
                  </Typography>
                  {spot.amenities.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                      {spot.amenities.map((a) => <Chip key={a} label={t(`spots.amenitiesOptions.${a}`) ?? a} size="small" variant="outlined" />)}
                    </Box>
                  )}
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2, gap: 1 }}>
                  <Button size="small" variant="outlined" startIcon={<Edit />} onClick={() => openEdit(spot)}>{t('common.edit')}</Button>
                  <IconButton size="small" color="error" onClick={() => handleDelete(spot.id)}><Delete fontSize="small" /></IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* ── Add/Edit Dialog ─────────────────────────────────────────── */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editSpot ? t('spots.editSpot') : t('spots.addNew')}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField {...register('name')} label={t('spots.form.name')} fullWidth error={!!errors.name} helperText={errors.name?.message} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField {...register('code')} label={t('spots.form.code')} fullWidth />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField {...register('description')} label={t('spots.form.description')} fullWidth multiline rows={2} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField {...register('maxPeople')} label={t('spots.form.maxPeople')} type="number" fullWidth />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField {...register('status')} label={t('spots.form.status')} fullWidth select defaultValue="AVAILABLE">
                  {['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'DISABLED'].map((s) => (
                    <MenuItem key={s} value={s}>{t(`spots.status.${s}`)}</MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}

// ─── Gallery Tab ─────────────────────────────────────────────────────────────

function GalleryTab({ location, locationId, onUpdated }: { location: LocationData; locationId: string; onUpdated: () => void }) {
  const { t } = useTranslation('owner');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseGallery = (): string[] => {
    if (!location.gallery) return [];
    try { return JSON.parse(location.gallery) as string[]; } catch { return []; }
  };

  const [images, setImages] = useState<string[]>(parseGallery);
  const [coverIdx, setCoverIdx] = useState<number | null>(location.coverImageIndex ?? null);

  // Sync when location changes (after save)
  useEffect(() => {
    setImages(parseGallery());
    setCoverIdx(location.coverImageIndex ?? null);
  }, [location.gallery, location.coverImageIndex]);

  const saveGallery = async (imgs: string[], newCoverIdx?: number | null) => {
    setSaving(true);
    setError(null);
    const coverToSave = newCoverIdx !== undefined ? newCoverIdx : coverIdx;
    // Clamp cover index if images were removed
    const validCover = coverToSave !== null && coverToSave < imgs.length ? coverToSave : null;
    try {
      const res = await fetch(`/api/activity-locations/${locationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gallery: JSON.stringify(imgs), coverImageIndex: validCover }),
      });
      if (!res.ok) throw new Error(t('locations.errors.saveFailed'));
      setCoverIdx(validCover);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleSetCover = (idx: number) => {
    const newCover = coverIdx === idx ? null : idx;
    setCoverIdx(newCover);
    saveGallery(images, newCover);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const remaining = 10 - images.length;
    const toProcess = files.slice(0, remaining);
    let processed = 0;
    const newImages: string[] = [];

    toProcess.forEach((file) => {
      if (file.size > 2 * 1024 * 1024) {
        setError(t('locations.gallery.fileTooLarge'));
        processed++;
        if (processed === toProcess.length && newImages.length > 0) {
          const updated = [...images, ...newImages];
          setImages(updated);
          saveGallery(updated);
        }
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        newImages.push(ev.target!.result as string);
        processed++;
        if (processed === toProcess.length) {
          const updated = [...images, ...newImages];
          setImages(updated);
          saveGallery(updated);
        }
      };
      reader.readAsDataURL(file);
    });
    // Reset input
    e.target.value = '';
  };

  const handleDelete = (idx: number) => {
    const updated = images.filter((_, i) => i !== idx);
    // Adjust cover index after deletion
    let newCover: number | null = coverIdx;
    if (coverIdx === idx) newCover = null;
    else if (coverIdx !== null && coverIdx > idx) newCover = coverIdx - 1;
    setImages(updated);
    setCoverIdx(newCover);
    saveGallery(updated, newCover);
  };

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Upload button + hint */}
      <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          component="label"
          variant="contained"
          startIcon={<CloudUpload />}
          disabled={saving || images.length >= 10}
        >
          {saving ? t('common.saving') : t('locations.gallery.addPhotos')}
          <input type="file" accept="image/*" multiple hidden onChange={handleFileChange} />
        </Button>
        <Typography variant="caption" color="text.secondary">
          {t('locations.gallery.hint', { count: images.length, max: 10 })}
        </Typography>
      </Box>

      {images.length > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
          {t('locations.gallery.coverHint')}
        </Typography>
      )}

      {/* Image grid */}
      {images.length === 0 ? (
        <Box
          sx={{
            border: '2px dashed',
            borderColor: 'divider',
            borderRadius: 2,
            py: 6,
            textAlign: 'center',
            color: 'text.secondary',
          }}
        >
          <Collections sx={{ fontSize: 48, mb: 1, opacity: 0.4 }} />
          <Typography variant="body2">{t('locations.gallery.empty')}</Typography>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 1.5,
          }}
        >
          {images.map((src, idx) => {
            const isCover = coverIdx === idx;
            return (
              <Box
                key={idx}
                sx={{
                  position: 'relative',
                  borderRadius: 1.5,
                  overflow: 'hidden',
                  aspectRatio: '4/3',
                  border: '2px solid',
                  borderColor: isCover ? 'warning.main' : 'divider',
                  bgcolor: 'action.hover',
                  '&:hover .del-btn': { opacity: 1 },
                  '&:hover .cover-btn': { opacity: 1 },
                  boxShadow: isCover ? '0 0 0 2px rgba(237,108,2,0.3)' : 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`Gallery image ${idx + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />

                {/* Cover badge */}
                {isCover && (
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      bgcolor: 'rgba(237,108,2,0.85)',
                      color: 'white',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      textAlign: 'center',
                      py: 0.25,
                      letterSpacing: 0.5,
                      textTransform: 'uppercase',
                    }}
                  >
                    {t('locations.gallery.coverBadge')}
                  </Box>
                )}

                {/* Set as cover button (star icon) */}
                <IconButton
                  className="cover-btn"
                  size="small"
                  onClick={() => handleSetCover(idx)}
                  title={t('locations.gallery.setCover')}
                  sx={{
                    position: 'absolute',
                    top: 4,
                    left: 4,
                    opacity: isCover ? 1 : 0,
                    transition: 'opacity 0.2s',
                    bgcolor: isCover ? 'warning.main' : 'rgba(255,255,255,0.9)',
                    color: isCover ? 'white' : 'warning.main',
                    '&:hover': {
                      bgcolor: isCover ? 'warning.dark' : 'white',
                    },
                    width: 26,
                    height: 26,
                  }}
                >
                  {isCover ? <Star sx={{ fontSize: 15 }} /> : <StarBorder sx={{ fontSize: 15 }} />}
                </IconButton>

                {/* Delete button */}
                <IconButton
                  className="del-btn"
                  size="small"
                  color="error"
                  onClick={() => handleDelete(idx)}
                  sx={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    bgcolor: 'rgba(255,255,255,0.9)',
                    '&:hover': { bgcolor: 'white' },
                  }}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function LocationDetailPage() {
  const { t } = useTranslation('owner');
  const params = useParams<{ id: string; locationId: string }>();
  const { id: placeId, locationId } = params;

  const [tab, setTab] = useState(0);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLocation = useCallback(() => {
    setLoading(true);
    fetch(`/api/activity-locations/${locationId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error(d.error ?? 'Failed to load location');
        setLocation(d.data);
      })
      .catch((e) => setError(e.message ?? 'Failed to load location'))
      .finally(() => setLoading(false));
  }, [locationId]);

  useEffect(() => { loadLocation(); }, [loadLocation]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !location) {
    return <Alert severity="error">{error ?? 'Location not found'}</Alert>;
  }

  return (
    <Box>
      <PageHeader
        title={location.name}
        subtitle={`${location.activityType.icon ?? ''} ${location.activityType.name}`.trim()}
        breadcrumbs={[
          { label: t('dashboard.title'), href: '/owner' },
          { label: t('places.title'), href: '/owner/places' },
          { label: location.place.name, href: `/owner/places/${placeId}` },
          { label: t('locations.title'), href: `/owner/places/${placeId}?tab=1` },
          { label: location.name },
        ]}
        action={
          <Button
            component={Link}
            href={`/owner/places/${placeId}`}
            variant="outlined"
            startIcon={<ArrowBack />}
            size="small"
          >
            {t('common.back')}
          </Button>
        }
        badge={location.isActive ? 'Active' : 'Inactive'}
      />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tab label={t('locations.editLocation')} />
        <Tab label={t('spots.title')} />
        <Tab label={t('locations.gallery.title')} />
      </Tabs>

      <TabPanel value={tab} index={0}>
        <SettingsTab location={location} locationId={locationId} onUpdated={loadLocation} />
      </TabPanel>
      <TabPanel value={tab} index={1}>
        <SpotsTab locationId={locationId} spots={location.spots} onUpdated={loadLocation} />
      </TabPanel>
      <TabPanel value={tab} index={2}>
        <GalleryTab location={location} locationId={locationId} onUpdated={loadLocation} />
      </TabPanel>
    </Box>
  );
}
