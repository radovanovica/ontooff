'use client';

import {
  Box,
  Button,
  Grid,
  TextField,
  Switch,
  FormControlLabel,
  CircularProgress,
  Alert,
  Typography,
  Paper,
  Chip,
} from '@mui/material';
import { ArrowBack, Check, MyLocation } from '@mui/icons-material';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from '@/i18n/client';
import PageHeader from '@/components/ui/PageHeader';

// ─── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  instructions: z.string().optional(),
  maxCapacity: z.coerce.number().int().positive().optional().or(z.literal('')),
  requiresSpot: z.boolean().default(true),
  sortOrder: z.coerce.number().default(0),
});

type FormValues = z.infer<typeof schema>;
type FormInputValues = z.input<typeof schema>;
type FormOutputValues = z.output<typeof schema>;

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ActivityType {
  id: string;
  name: string;
  icon: string | null;
}

interface ExistingZone {
  id: string;
  name: string;
  svgMapData: string | null;
}

interface PlaceData {
  id: string;
  name: string;
  mapImageUrl: string | null;
  mapWidth: number | null;
  mapHeight: number | null;
  activityLocations: ExistingZone[];
}

const ZONE_COLORS = [
  '#1565c0', '#2e7d32', '#c62828', '#e65100',
  '#6a1b9a', '#00695c', '#ad1457', '#4e342e',
];

const DEFAULT_MAP_WIDTH = 900;
const DEFAULT_MAP_HEIGHT = 600;
const ZONE_RADIUS = 32;

// ─── Component ─────────────────────────────────────────────────────────────────

export default function NewLocationPage() {
  const { t } = useTranslation('owner');
  const params = useParams<{ id: string }>();
  const placeId = params.id;
  const router = useRouter();

  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [place, setPlace] = useState<PlaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Activity types multi-select state
  const [selectedActivityTypeIds, setSelectedActivityTypeIds] = useState<string[]>([]);

  // Zone position picked on map
  const [pickedZone, setPickedZone] = useState<{ cx: number; cy: number } | null>(null);
  const [pickingMode, setPickingMode] = useState(true); // start in picking mode so user can click immediately
  const svgRef = useRef<SVGSVGElement>(null);

  const { register, handleSubmit, control, formState: { errors } } = useForm<FormInputValues, unknown, FormOutputValues>({
    resolver: zodResolver(schema),
    defaultValues: { requiresSpot: true, sortOrder: 0 },
  });

  // ── Load place + activity types ────────────────────────────────────────

  useEffect(() => {
    if (!placeId) return;
    Promise.all([
      fetch(`/api/activity-types?placeId=${placeId}`).then((r) => r.json()),
      fetch(`/api/places/${placeId}`).then((r) => r.json()),
    ])
      .then(([typesRes, placeRes]) => {
        setActivityTypes(typesRes.data ?? []);
        if (placeRes.success) setPlace(placeRes.data);
      })
      .catch(() => setActivityTypes([]))
      .finally(() => setLoading(false));
  }, [placeId]);

  // ── Map coordinate helpers ─────────────────────────────────────────────

  const mapWidth = place?.mapWidth ?? DEFAULT_MAP_WIDTH;
  const mapHeight = place?.mapHeight ?? DEFAULT_MAP_HEIGHT;

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

  const handleMapClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!pickingMode) return;
      const { x, y } = getSvgCoords(e.clientX, e.clientY);
      setPickedZone({ cx: x, cy: y });
      setPickingMode(false);
    },
    [pickingMode, getSvgCoords]
  );

  // ── Submit ─────────────────────────────────────────────────────────────

  const onSubmit = async (data: FormOutputValues) => {
    if (selectedActivityTypeIds.length === 0) {
      setError('At least one activity type is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const svgMapData = pickedZone
        ? JSON.stringify({ type: 'circle', cx: pickedZone.cx, cy: pickedZone.cy, r: ZONE_RADIUS })
        : undefined;

      const res = await fetch('/api/activity-locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeId,
          activityTypeIds: selectedActivityTypeIds,
          name: data.name,
          description: data.description || undefined,
          instructions: data.instructions || undefined,
          maxCapacity: data.maxCapacity === '' ? undefined : Number(data.maxCapacity) || undefined,
          requiresSpot: data.requiresSpot,
          sortOrder: Number(data.sortOrder) || 0,
          svgMapData,
          // Inherit place map settings for spot sub-map defaults
          mapWidth,
          mapHeight,
          mapImageUrl: place?.mapImageUrl ?? undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? 'Create failed');
      }
      const json = await res.json();
      router.push(`/owner/places/${placeId}/locations/${json.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  const hasMap = !!(place?.mapImageUrl);

  return (
    <Box>
      <PageHeader
        title={t('locations.addNew')}
        breadcrumbs={[
          { label: t('dashboard.title'), href: '/owner' },
          { label: t('places.title'), href: '/owner/places' },
          { label: place?.name ?? placeId, href: `/owner/places/${placeId}` },
          { label: t('locations.title'), href: `/owner/places/${placeId}?tab=1` },
          { label: t('locations.addNew') },
        ]}
        action={
          <Button component={Link} href={`/owner/places/${placeId}`} variant="outlined" startIcon={<ArrowBack />} size="small">
            {t('common.back')}
          </Button>
        }
      />

      <Grid container spacing={3} sx={{ alignItems: 'flex-start' }}>
        {/* ── Left: form ───────────────────────────────────────────────── */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
            {activityTypes.length === 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                {t('locations.noActivityTypes')}
              </Alert>
            )}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Box component="form" id="new-location-form" onSubmit={handleSubmit(onSubmit)}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>{t('locations.detailsTitle')}</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    {...register('name')}
                    label={t('locations.form.name')}
                    fullWidth
                    error={!!errors.name}
                    helperText={errors.name?.message}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    {t('locations.form.activityType')}
                  </Typography>
                  {activityTypes.length === 0 ? (
                    <Typography variant="caption" color="text.secondary">{t('locations.noActivityTypes')}</Typography>
                  ) : (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
                      {activityTypes.map((at) => {
                        const selected = selectedActivityTypeIds.includes(at.id);
                        return (
                          <Chip
                            key={at.id}
                            label={`${at.icon ?? ''} ${at.name}`.trim()}
                            onClick={() =>
                              setSelectedActivityTypeIds((prev) =>
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
                  )}
                  {selectedActivityTypeIds.length === 0 && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                      At least one activity type is required
                    </Typography>
                  )}
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    {...register('maxCapacity')}
                    label={t('locations.form.maxCapacity')}
                    type="number"
                    fullWidth
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
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
                    rows={3}
                    placeholder={t('locations.form.instructionsPlaceholder')}
                    helperText={t('locations.form.instructionsHint')}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Controller
                    name="requiresSpot"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                        label={t('locations.form.requiresSpot')}
                      />
                    )}
                  />
                </Grid>
              </Grid>

              {/* Map position summary */}
              <Box sx={{ mt: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  {t('locations.positionOnMap')}
                </Typography>
                {pickedZone ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={`cx=${pickedZone.cx}, cy=${pickedZone.cy}`}
                      color="success"
                      size="small"
                      icon={<MyLocation />}
                    />
                    <Button size="small" sx={{ fontSize: '0.7rem', px: 0.75, py: 0 }} onClick={() => { setPickedZone(null); }}>
                      {t('common.clear')}
                    </Button>
                  </Box>
                ) : (
                  <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    {hasMap ? t('locations.pickOnMapHint') : t('locations.noPlaceMapHint')}
                  </Typography>
                )}
              </Box>

              <Box sx={{ mt: 3 }}>
                <Button
                  type="submit"
                  form="new-location-form"
                  variant="contained"
                  size="large"
                  disabled={saving || selectedActivityTypeIds.length === 0}
                  startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Check />}
                >
                  {saving ? t('common.saving') : t('locations.create')}
                </Button>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* ── Right: place map picker ────────────────────────────────── */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {t('locations.placeMapPickerTitle')}
              </Typography>
              {hasMap && (
                <Button
                  variant={pickingMode ? 'contained' : 'outlined'}
                  size="small"
                  color="primary"
                  startIcon={<MyLocation />}
                  onClick={() => setPickingMode((v) => !v)}
                >
                  {pickingMode ? t('locations.clickMapToPlace') : pickedZone ? t('locations.reposition') : t('locations.pickOnMap')}
                </Button>
              )}
            </Box>

            {!hasMap ? (
              <Alert severity="info">
                {t('locations.noMapBackgroundHint')}
              </Alert>
            ) : (
              <Box
                sx={{
                  border: '2px solid',
                  borderColor: pickingMode ? 'primary.main' : 'divider',
                  borderRadius: 1.5,
                  overflow: 'hidden',
                  cursor: pickingMode ? 'crosshair' : 'default',
                  bgcolor: '#f0ebe3',
                  transition: 'border-color 0.2s',
                  position: 'relative',
                }}
              >
                {pickingMode && (
                  <Box
                    sx={{
                      position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
                      zIndex: 10, pointerEvents: 'none',
                    }}
                  >
                    <Chip label={t('locations.clickToMarkPosition')} color="primary" size="small" icon={<MyLocation />} />
                  </Box>
                )}

                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${mapWidth} ${mapHeight}`}
                  style={{ width: '100%', height: 'auto', display: 'block', maxHeight: 500, userSelect: 'none' }}
                  onClick={handleMapClick}
                >
                  {/* Background */}
                  <image
                    href={place.mapImageUrl!}
                    x={0} y={0}
                    width={mapWidth} height={mapHeight}
                    preserveAspectRatio="xMidYMid slice"
                  />

                  {/* Existing location zones */}
                  {(place.activityLocations ?? []).map((zone, idx) => {
                    if (!zone.svgMapData) return null;
                    try {
                      const d = JSON.parse(zone.svgMapData) as { cx: number; cy: number; r: number };
                      const color = ZONE_COLORS[idx % ZONE_COLORS.length];
                      return (
                        <g key={zone.id}>
                          <circle cx={d.cx} cy={d.cy} r={d.r ?? ZONE_RADIUS} fill={color} fillOpacity={0.6} stroke="white" strokeWidth={2} />
                          <text
                            x={d.cx} y={d.cy + (d.r ?? ZONE_RADIUS) + 14}
                            textAnchor="middle" fill="rgba(0,0,0,0.8)" fontSize={11} fontWeight={700}
                            stroke="rgba(255,255,255,0.95)" strokeWidth={3} paintOrder="stroke"
                            style={{ pointerEvents: 'none' }}
                          >
                            {zone.name}
                          </text>
                        </g>
                      );
                    } catch { return null; }
                  })}

                  {/* New zone preview */}
                  {pickedZone && (
                    <g>
                      <circle
                        cx={pickedZone.cx} cy={pickedZone.cy} r={ZONE_RADIUS}
                        fill="#1565c0" fillOpacity={0.85}
                        stroke="white" strokeWidth={3}
                        strokeDasharray="6 3"
                      />
                      <text
                        x={pickedZone.cx} y={pickedZone.cy}
                        textAnchor="middle" dominantBaseline="middle"
                        fill="white" fontSize={11} fontWeight={700}
                        style={{ pointerEvents: 'none' }}
                      >
                        NEW
                      </text>
                    </g>
                  )}
                </svg>
              </Box>
            )}

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              {hasMap
                ? 'Existing location zones are shown. Click "Pick on map" then click where this new location sits.'
                : 'Set a place map background first to enable zone placement.'}
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
