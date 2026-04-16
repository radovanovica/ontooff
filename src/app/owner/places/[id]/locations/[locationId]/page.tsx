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
  Divider,
  InputAdornment,
  Paper,
} from '@mui/material';
import { ArrowBack, Add, Delete, Edit, CloudUpload, Collections, Star, StarBorder, PinDrop, Search, Close, MyLocation, Schedule } from '@mui/icons-material';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from '@/i18n/client';
import PageHeader from '@/components/ui/PageHeader';
import { uploadFileToS3 } from '@/lib/upload';
import dynamic from 'next/dynamic';
import type MapPickerType from '@/components/map/MapPicker';

const MapPicker = dynamic(() => import('@/components/map/MapPicker'), {
  ssr: false,
  loading: () => null,
}) as unknown as typeof MapPickerType;

// ─── Types ───────────────────────────────────────────────────────────────────

const ZONE_RADIUS = 32;

interface PlaceMapData {
  mapImageUrl: string | null;
  mapWidth: number | null;
  mapHeight: number | null;
  activityLocations: { id: string; name: string; svgMapData: string | null }[];
}

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
  latitude: number | null;
  longitude: number | null;
  gallery: string | null;           // JSON: string[]
  coverImageIndex: number | null;    // index of primary gallery image
  instructions: string | null;       // How to find the place
  svgMapData: string | null;
  activityTypes: Array<{
    activityTypeId: string;
    activityType: { id: string; name: string; icon: string | null; color: string | null };
  }>;
  place: { id: string; name: string };
  spots: SpotData[];
}

interface TimeslotData {
  id: string;
  name: string;
  startTime: string | null;
  endTime: string | null;
  isWholeDay: boolean;
  isActive: boolean;
  sortOrder: number;
}

interface SpotData {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  maxPeople: number;
  minDays: number | null;
  maxDays: number | null;
  status: string;
  amenities: string[];
  svgShapeData: string | null;
  activityTypeId: string | null;
  timeslots: TimeslotData[];
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

const locationSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  instructions: z.string().optional(),
  maxCapacity: z.coerce.number().int().positive().optional().or(z.literal('')),
  requiresSpot: z.boolean(),
  isActive: z.boolean(),
  sortOrder: z.coerce.number().default(0),
  latitude: z.coerce.number().optional().or(z.literal('')),
  longitude: z.coerce.number().optional().or(z.literal('')),
});

const spotSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  description: z.string().optional(),
  maxPeople: z.coerce.number().int().positive().default(1),
  minDays: z.coerce.number().int().positive().nullable().optional().or(z.literal('')),
  maxDays: z.coerce.number().int().positive().nullable().optional().or(z.literal('')),
  status: z.enum(['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'DISABLED']).default('AVAILABLE'),
  activityTypeId: z.string().nullable().optional(),
});

type LocationFormValues = z.input<typeof locationSchema>;
type SpotFormValues = z.input<typeof spotSchema>;

// ─── TabPanel ────────────────────────────────────────────────────────────────

function TabPanel({ children, value, index }: { children?: React.ReactNode; value: number; index: number }) {
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null;
}

// ─── Settings Tab ────────────────────────────────────────────────────────────

function SettingsTab({ location, locationId, placeId, onUpdated, allActivityTypes }: { location: LocationData; locationId: string; placeId: string; onUpdated: () => void; allActivityTypes: Array<{ id: string; name: string; icon: string | null; color: string | null }> }) {
  const { t } = useTranslation('owner');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);

  // Activity types state: all types equal priority
  const [activityTypeIds, setActivityTypeIds] = useState<string[]>(
    location.activityTypes.map((a) => a.activityTypeId)
  );

  // Virtual map zone state
  const [placeMap, setPlaceMap] = useState<PlaceMapData | null>(null);
  const [pickingZone, setPickingZone] = useState(false);
  const [zonePosition, setZonePosition] = useState<{ cx: number; cy: number } | null>(() => {
    if (!location.svgMapData) return null;
    try {
      const d = JSON.parse(location.svgMapData) as { cx: number; cy: number };
      return { cx: d.cx, cy: d.cy };
    } catch { return null; }
  });
  const svgRef = useRef<SVGSVGElement>(null);
  const [savingZone, setSavingZone] = useState(false);

  // Load place map data for virtual zone editor
  useEffect(() => {
    fetch(`/api/places/${placeId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setPlaceMap(d.data);
      })
      .catch(() => null);
  }, [placeId]);

  const mapWidth = placeMap?.mapWidth ?? 900;
  const mapHeight = placeMap?.mapHeight ?? 600;

  const getSvgCoords = useCallback(
    (clientX: number, clientY: number) => {
      const el = svgRef.current;
      if (!el) return { x: 0, y: 0 };
      const rect = el.getBoundingClientRect();
      return {
        x: Math.round((clientX - rect.left) * (mapWidth / rect.width)),
        y: Math.round((clientY - rect.top) * (mapHeight / rect.height)),
      };
    },
    [mapWidth, mapHeight]
  );

  const handleSvgClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!pickingZone) return;
      const { x, y } = getSvgCoords(e.clientX, e.clientY);
      setZonePosition({ cx: x, cy: y });
      setPickingZone(false);
    },
    [pickingZone, getSvgCoords]
  );

  const handleSaveZone = async (newPos: { cx: number; cy: number } | null) => {
    setSavingZone(true);
    try {
      const svgMapData = newPos
        ? JSON.stringify({ type: 'circle', cx: newPos.cx, cy: newPos.cy, r: ZONE_RADIUS })
        : null;
      const res = await fetch(`/api/activity-locations/${locationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ svgMapData }),
      });
      if (!res.ok) throw new Error('Save failed');
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSavingZone(false);
    }
  };

  const { register, handleSubmit, control, setValue, watch, formState: { errors } } = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: location.name,
      description: location.description ?? '',
      instructions: location.instructions ?? '',
      maxCapacity: location.maxCapacity ?? undefined,
      requiresSpot: location.requiresSpot,
      isActive: location.isActive,
      sortOrder: location.sortOrder,
      latitude: location.latitude ?? '',
      longitude: location.longitude ?? '',
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
          latitude: data.latitude === '' ? null : data.latitude === undefined ? null : Number(data.latitude),
          longitude: data.longitude === '' ? null : data.longitude === undefined ? null : Number(data.longitude),
          activityTypeIds,
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
        {/* Activity Types */}
        {allActivityTypes.length > 0 && (
          <Grid size={{ xs: 12 }}>
            <Typography variant="subtitle2" gutterBottom>
              {t('locations.form.activityTypesLabel')}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              {t('locations.form.activityTypesHint')}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
              {allActivityTypes.map((at) => {
                const selected = activityTypeIds.includes(at.id);
                return (
                  <Chip
                    key={at.id}
                    label={`${at.icon ?? ''} ${at.name}`.trim()}
                    onClick={() =>
                      setActivityTypeIds((prev) =>
                        selected ? prev.filter((id) => id !== at.id) : [...prev, at.id]
                      )
                    }
                    color={selected ? 'primary' : 'default'}
                    variant={selected ? 'filled' : 'outlined'}
                    clickable
                  />
                );
              })}
            </Box>
          </Grid>
        )}
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            {...register('maxCapacity')}
            label={t('locations.form.maxCapacity')}
            type="number"
            fullWidth
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Divider sx={{ my: 1 }}>{t('locations.form.mapPinLocation')}</Divider>
        </Grid>
        <Grid size={{ xs: 12 }}>
          {/* Read-only lat/lng display + picker button */}
          {(() => {
            const lat = watch('latitude');
            const lng = watch('longitude');
            const hasCoords = lat !== '' && lat !== undefined && lng !== '' && lng !== undefined;
            return (
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: 1, minWidth: 180 }}>
                    {hasCoords ? (
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        📍 {Number(lat).toFixed(6)}, {Number(lng).toFixed(6)}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">{t('locations.form.noPinSet')}</Typography>
                    )}
                  </Box>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<PinDrop />}
                    onClick={() => setMapPickerOpen(true)}
                  >
                    {hasCoords ? t('locations.form.repositionPin') : t('locations.form.pinOnMap')}
                  </Button>
                  {hasCoords && (
                    <Button
                      variant="text"
                      size="small"
                      color="error"
                      startIcon={<Close />}
                      onClick={() => { setValue('latitude', ''); setValue('longitude', ''); }}
                    >
                      {t('common.clear')}
                    </Button>
                  )}
                </Box>
              </Paper>
            );
          })()}

          {/* Hidden inputs to keep RHF registration */}
          <input type="hidden" {...register('latitude')} />
          <input type="hidden" {...register('longitude')} />

          {/* Map picker dialog */}
          <Dialog open={mapPickerOpen} onClose={() => setMapPickerOpen(false)} maxWidth="md" fullWidth>
            <DialogTitle sx={{ pb: 1 }}>{t('locations.form.pinOnMapDialogTitle')}</DialogTitle>
            <DialogContent sx={{ p: 0 }}>
              <MapPicker
                initialLat={watch('latitude') !== '' ? Number(watch('latitude')) : undefined}
                initialLng={watch('longitude') !== '' ? Number(watch('longitude')) : undefined}
                onConfirm={(lat: number, lng: number) => {
                  setValue('latitude', lat);
                  setValue('longitude', lng);
                  setMapPickerOpen(false);
                }}
                onCancel={() => setMapPickerOpen(false)}
              />
            </DialogContent>
          </Dialog>
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

      {/* ── Virtual Map Zone Placement ───────────────────────────────── */}
      {placeMap?.mapImageUrl && (
        <Box sx={{ mt: 4 }}>
          <Divider sx={{ mb: 3 }}>{t('locations.form.virtualMapZone')}</Divider>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {t('locations.form.zoneOnPlaceMap')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {zonePosition
                  ? `Placed at cx=${zonePosition.cx}, cy=${zonePosition.cy}`
                  : t('locations.form.noZonePlaced')}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant={pickingZone ? 'contained' : 'outlined'}
                size="small"
                startIcon={<MyLocation />}
                onClick={() => setPickingZone((v) => !v)}
              >
                {pickingZone ? t('locations.clickMapToPlace') : zonePosition ? t('locations.form.moveZone') : t('locations.form.placeOnMap')}
              </Button>
              {zonePosition && (
                <Button
                  variant="outlined"
                  size="small"
                  color="error"
                  onClick={() => {
                    setZonePosition(null);
                    handleSaveZone(null);
                  }}
                  disabled={savingZone}
                >
                  {t('common.delete')}
                </Button>
              )}
              {zonePosition && (
                <Button
                  variant="contained"
                  size="small"
                  color="success"
                  onClick={() => handleSaveZone(zonePosition)}
                  disabled={savingZone}
                >
                  {savingZone ? t('common.saving') : t('locations.form.saveZone')}
                </Button>
              )}
            </Box>
          </Box>
          <Box
            sx={{
              border: '2px solid',
              borderColor: pickingZone ? 'primary.main' : 'divider',
              borderRadius: 1.5,
              overflow: 'hidden',
              cursor: pickingZone ? 'crosshair' : 'default',
              bgcolor: '#f0ebe3',
              transition: 'border-color 0.2s',
              position: 'relative',
            }}
          >
            {pickingZone && (
              <Box
                sx={{
                  position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
                  zIndex: 10, pointerEvents: 'none',
                }}
              >
                <Chip label={t('locations.clickMapToPlace')} color="primary" size="small" icon={<MyLocation />} />
              </Box>
            )}
            <svg
              ref={svgRef}
              viewBox={`0 0 ${mapWidth} ${mapHeight}`}
              style={{ width: '100%', height: 'auto', display: 'block', maxHeight: 500, userSelect: 'none' }}
              onClick={handleSvgClick}
            >
              <image
                href={placeMap.mapImageUrl}
                x={0} y={0}
                width={mapWidth} height={mapHeight}
                preserveAspectRatio="xMidYMid slice"
              />
              {/* Other locations */}
              {(placeMap.activityLocations ?? [])
                .filter((z) => z.id !== locationId && z.svgMapData)
                .map((z) => {
                  try {
                    const d = JSON.parse(z.svgMapData!) as { cx: number; cy: number; r?: number };
                    return (
                      <g key={z.id} style={{ pointerEvents: 'none' }}>
                        <circle cx={d.cx} cy={d.cy} r={d.r ?? ZONE_RADIUS} fill="#1b5e20" fillOpacity={0.5} stroke="white" strokeWidth={2} />
                        <text x={d.cx} y={d.cy + (d.r ?? ZONE_RADIUS) + 14}
                          textAnchor="middle" fill="rgba(0,0,0,0.75)" fontSize={11} fontWeight={700}
                          stroke="rgba(255,255,255,0.95)" strokeWidth={3} paintOrder="stroke">
                          {z.name}
                        </text>
                      </g>
                    );
                  } catch { return null; }
                })}
              {/* This location's zone */}
              {zonePosition && (
                <g style={{ pointerEvents: 'none' }}>
                  <circle cx={zonePosition.cx} cy={zonePosition.cy} r={ZONE_RADIUS}
                    fill="#0d47a1" fillOpacity={0.85} stroke="#ffeb3b" strokeWidth={3} />
                  <text x={zonePosition.cx} y={zonePosition.cy + 4}
                    textAnchor="middle" fill="white" fontSize={14} fontWeight={900}
                    stroke="rgba(0,0,0,0.55)" strokeWidth={2} paintOrder="stroke">
                    ✓
                  </text>
                  <text x={zonePosition.cx} y={zonePosition.cy + ZONE_RADIUS + 14}
                    textAnchor="middle" fill="#0d47a1" fontSize={12} fontWeight={900}
                    stroke="rgba(255,255,255,0.98)" strokeWidth={4} paintOrder="stroke">
                    {location.name}
                  </text>
                </g>
              )}
            </svg>
          </Box>
        </Box>
      )}

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
  locationActivityTypes,
}: {
  locationId: string;
  spots: SpotData[];
  onUpdated: () => void;
  locationActivityTypes: Array<{ id: string; name: string; icon: string | null }>;
}) {
  const { t } = useTranslation('owner');
  const [open, setOpen] = useState(false);
  const [editSpot, setEditSpot] = useState<SpotData | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeslotSpot, setTimeslotSpot] = useState<SpotData | null>(null);

  const { register, handleSubmit, reset, formState: { errors }, setValue: setSpotValue, watch: watchSpot } = useForm<SpotFormValues>({
    resolver: zodResolver(spotSchema),
  });

  const openAdd = () => {
    setEditSpot(null);
    reset({ name: '', code: '', description: '', maxPeople: 1, minDays: '', maxDays: '', status: 'AVAILABLE', activityTypeId: null });
    setOpen(true);
  };

  const openEdit = (spot: SpotData) => {
    setEditSpot(spot);
    reset({ name: spot.name, code: spot.code ?? '', description: spot.description ?? '', maxPeople: spot.maxPeople, minDays: spot.minDays ?? '', maxDays: spot.maxDays ?? '', status: spot.status as SpotFormValues['status'], activityTypeId: spot.activityTypeId ?? null });
    setOpen(true);
  };

  const onSubmit = async (data: SpotFormValues) => {
    setSaving(true);
    setError(null);
    const payload = {
      ...data,
      activityTypeId: data.activityTypeId || null,
      minDays: data.minDays === '' ? null : data.minDays ?? null,
      maxDays: data.maxDays === '' ? null : data.maxDays ?? null,
    };
    try {
      if (editSpot) {
        const res = await fetch(`/api/spots`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editSpot.id, ...payload }),
        });
        if (!res.ok) throw new Error(t('spots.errors.saveFailed'));
      } else {
        const res = await fetch('/api/spots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activityLocationId: locationId, ...payload }),
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
                  {spot.activityTypeId && (() => {
                    const at = locationActivityTypes.find((a) => a.id === spot.activityTypeId);
                    return at ? (
                      <Chip
                        size="small"
                        label={`${at.icon ?? ''} ${at.name}`.trim()}
                        variant="outlined"
                        color="primary"
                        sx={{ mb: 1 }}
                      />
                    ) : null;
                  })()}
                  {spot.description && <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{spot.description}</Typography>}
                  <Typography variant="caption" color="text.secondary">
                    {t('spots.maxPeopleLabel', { count: spot.maxPeople })}
                    {(spot.minDays || spot.maxDays) && (
                      <> &nbsp;·&nbsp; {spot.minDays && `min ${spot.minDays}d`}{spot.minDays && spot.maxDays && ' – '}{spot.maxDays && `max ${spot.maxDays}d`}</>
                    )}
                  </Typography>
                  {spot.timeslots.length > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.75 }}>
                      <Schedule sx={{ fontSize: 13, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">
                        {t('spots.timeslotCount', { count: spot.timeslots.length })}
                      </Typography>
                    </Box>
                  )}
                  {spot.amenities.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1.5 }}>
                      {spot.amenities.map((a) => <Chip key={a} label={t(`spots.amenitiesOptions.${a}`) ?? a} size="small" variant="outlined" />)}
                    </Box>
                  )}
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2, gap: 1 }}>
                  <Button size="small" variant="outlined" startIcon={<Edit />} onClick={() => openEdit(spot)}>{t('common.edit')}</Button>
                  <IconButton size="small" color="primary" title="Manage timeslots" onClick={() => setTimeslotSpot(spot)}><Schedule fontSize="small" /></IconButton>
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
              {locationActivityTypes.length > 0 && (
                <Grid size={{ xs: 12 }}>
                  <TextField
                    select
                    fullWidth
                    label={t('spots.form.activityType')}
                    value={watchSpot('activityTypeId') ?? ''}
                    onChange={(e) => setSpotValue('activityTypeId', e.target.value || null)}
                    helperText={t('spots.form.activityTypeHint')}
                  >
                    <MenuItem value="">{t('spots.form.allActivities')}</MenuItem>
                    {locationActivityTypes.map((at) => (
                      <MenuItem key={at.id} value={at.id}>
                        {at.icon ? `${at.icon} ` : ''}{at.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              )}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  {...register('minDays')}
                  label={t('spots.form.minDays')}
                  type="number"
                  fullWidth
                  slotProps={{ htmlInput: { min: 1 } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  {...register('maxDays')}
                  label={t('spots.form.maxDays')}
                  type="number"
                  fullWidth
                  slotProps={{ htmlInput: { min: 1 } }}
                />
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

      {/* ── Timeslot Manager Dialog ──────────────────────────────────── */}
      {timeslotSpot && (
        <TimeslotDialog
          spot={timeslotSpot}
          onClose={() => setTimeslotSpot(null)}
          onUpdated={() => { setTimeslotSpot(null); onUpdated(); }}
        />
      )}
    </Box>
  );
}

// ─── Timeslot Dialog ──────────────────────────────────────────────────────────

const timeslotFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  isWholeDay: z.boolean(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  sortOrder: z.coerce.number().default(0),
});
type TimeslotFormValues = z.input<typeof timeslotFormSchema>;

function TimeslotDialog({
  spot,
  onClose,
  onUpdated,
}: {
  spot: SpotData;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const { t } = useTranslation('owner');
  const [timeslots, setTimeslots] = useState<TimeslotData[]>(spot.timeslots);
  const [addOpen, setAddOpen] = useState(false);
  const [editTs, setEditTs] = useState<TimeslotData | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<TimeslotFormValues>({
    resolver: zodResolver(timeslotFormSchema),
    defaultValues: { isWholeDay: false, sortOrder: timeslots.length },
  });
  const isWholeDay = watch('isWholeDay');
  const isMultiDay = (spot.maxDays ?? 1) > 1;

  const openAdd = () => {
    setEditTs(null);
    reset({ name: '', isWholeDay: isMultiDay, startTime: '', endTime: '', sortOrder: timeslots.length });
    setAddOpen(true);
  };

  const openEdit = (ts: TimeslotData) => {
    setEditTs(ts);
    reset({ name: ts.name, isWholeDay: ts.isWholeDay, startTime: ts.startTime ?? '', endTime: ts.endTime ?? '', sortOrder: ts.sortOrder });
    setAddOpen(true);
  };

  const onSubmit = async (data: TimeslotFormValues) => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...data,
        sortOrder: Number(data.sortOrder) || 0,
        startTime: data.isWholeDay ? null : (data.startTime || null),
        endTime: data.isWholeDay ? null : (data.endTime || null),
      };
      if (editTs) {
        const res = await fetch('/api/timeslots', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editTs.id, ...payload }),
        });
        if (!res.ok) throw new Error(t('timeslots.errors.updateFailed'));
        const updated: TimeslotData = { ...editTs, ...payload };
        setTimeslots((prev) => prev.map((t) => (t.id === editTs.id ? updated : t)));
      } else {
        const res = await fetch('/api/timeslots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ spotId: spot.id, ...payload }),
        });
        if (!res.ok) throw new Error(t('timeslots.errors.createFailed'));
        const json = await res.json() as { data: TimeslotData };
        setTimeslots((prev) => [...prev, json.data]);
      }
      setAddOpen(false);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('timeslots.deleteConfirm'))) return;
    await fetch('/api/timeslots', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setTimeslots((prev) => prev.filter((t) => t.id !== id));
    onUpdated();
  };

  return (
    <>
      <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {t('timeslots.dialogTitle', { name: spot.name })}
          {isMultiDay && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {t('timeslots.multiDayNote')}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {timeslots.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
              {t('timeslots.empty')}
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
              {timeslots.map((ts) => (
                <Box
                  key={ts.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 1.5,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Schedule fontSize="small" color="action" />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{ts.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {ts.isWholeDay ? t('timeslots.wholeDay') : `${ts.startTime ?? '?'} – ${ts.endTime ?? '?'}`}
                    </Typography>
                  </Box>
                  <Chip label={`#${ts.sortOrder}`} size="small" variant="outlined" sx={{ fontSize: 10 }} />
                  <IconButton size="small" onClick={() => openEdit(ts)}><Edit fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(ts.id)}><Delete fontSize="small" /></IconButton>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={onClose}>{t('common.close')}</Button>
          <Button variant="contained" startIcon={<Add />} onClick={openAdd}>{t('timeslots.addTitle')}</Button>
        </DialogActions>
      </Dialog>

      {/* Add/Edit Timeslot sub-dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editTs ? t('timeslots.editTitle') : t('timeslots.addTitle')}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <TextField {...register('name')} label={t('timeslots.nameLabel')} fullWidth error={!!errors.name} helperText={errors.name?.message} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormControlLabel
                  control={<Switch {...register('isWholeDay')} checked={isWholeDay} disabled={isMultiDay} />}
                  label={t('timeslots.wholeDay')}
                />
                {isMultiDay && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {t('timeslots.requiredForMultiDay')}
                  </Typography>
                )}
              </Grid>
              {!isWholeDay && (
                <>
                  <Grid size={{ xs: 6 }}>
                    <TextField {...register('startTime')} label={t('timeslots.startTime')} type="time" fullWidth slotProps={{ inputLabel: { shrink: true } }} />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <TextField {...register('endTime')} label={t('timeslots.endTime')} type="time" fullWidth slotProps={{ inputLabel: { shrink: true } }} />
                  </Grid>
                </>
              )}
              <Grid size={{ xs: 12 }}>
                <TextField {...register('sortOrder')} label={t('timeslots.sortOrder')} type="number" fullWidth />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setAddOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </>
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const remaining = 10 - images.length;
    const toProcess = files.slice(0, remaining);

    setSaving(true);
    setError(null);
    try {
      const uploaded = await Promise.all(
        toProcess.map(async (file) => {
          if (file.size > 10 * 1024 * 1024) {
            throw new Error(t('locations.gallery.fileTooLarge'));
          }
          return uploadFileToS3(file, 'images/gallery');
        })
      );
      const updated = [...images, ...uploaded];
      setImages(updated);
      await saveGallery(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setSaving(false);
    }
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
  const [allActivityTypes, setAllActivityTypes] = useState<Array<{ id: string; name: string; icon: string | null; color: string | null }>>([]);

  // Load all activity types for the place once
  useEffect(() => {
    fetch(`/api/places/${placeId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.data.activityTypes)) {
          setAllActivityTypes(d.data.activityTypes);
        }
      })
      .catch(() => null);
  }, [placeId]);

  const loadLocation = useCallback(() => {
    setLoading(true);
    fetch(`/api/activity-locations/${locationId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error(d.error ?? t('locations.errors.loadFailed'));
        setLocation(d.data);
      })
      .catch((e) => setError(e.message ?? t('locations.errors.loadFailed')))
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
    return <Alert severity="error">{error ?? t('locations.errors.loadFailed')}</Alert>;
  }

  return (
    <Box>
      <PageHeader
        title={location.name}
        subtitle={location.activityTypes.map((a) => `${a.activityType.icon ?? ''} ${a.activityType.name}`.trim()).join(' · ')}
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
        badge={location.isActive ? t('common.active') : t('common.inactive')}
      />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tab label={t('locations.editLocation')} />
        <Tab label={t('spots.title')} />
        <Tab label={t('locations.gallery.title')} />
      </Tabs>

      <TabPanel value={tab} index={0}>
        <SettingsTab location={location} locationId={locationId} placeId={placeId} onUpdated={loadLocation} allActivityTypes={allActivityTypes} />
      </TabPanel>
      <TabPanel value={tab} index={1}>
        <SpotsTab
          locationId={locationId}
          spots={location.spots}
          onUpdated={loadLocation}
          locationActivityTypes={location.activityTypes.map((a) => a.activityType)}
        />
      </TabPanel>
      <TabPanel value={tab} index={2}>
        <GalleryTab location={location} locationId={locationId} onUpdated={loadLocation} />
      </TabPanel>
    </Box>
  );
}
