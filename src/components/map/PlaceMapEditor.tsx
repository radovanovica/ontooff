'use client';

/**
 * PlaceMapEditor
 *
 * Used during Place creation (and in Place settings) to:
 * 1. Set a background map image for the whole place
 * 2. Draw / reposition circular zone markers — one per ActivityLocation
 *
 * Each zone marker stores its position as `svgMapData` JSON on the
 * ActivityLocation: { type: 'circle', cx, cy, r, label }
 */

import {
  Box,
  Button,
  Typography,
  TextField,
  IconButton,
  Tooltip,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  Stack,
  MenuItem,
} from '@mui/material';
import { Delete, Add, Save, MyLocation, Map as MapIcon, UploadFile, Clear } from '@mui/icons-material';
import { useState, useRef, useCallback, useEffect } from 'react';
import { uploadFileToS3 } from '@/lib/upload';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LocationZone {
  id: string;        // ActivityLocation id (empty string = unsaved)
  name: string;
  activityTypeId: string;
  activityTypeName: string;
  activityTypeIcon?: string | null;
  svgMapData?: string | null; // { type:'circle', cx, cy, r }
  // derived
  cx?: number;
  cy?: number;
  r?: number;
}

interface PlaceMapEditorProps {
  /** Place id — needed to save location zones */
  placeId: string;
  /** Current background image URL of the place */
  mapImageUrl?: string | null;
  mapWidth?: number;
  mapHeight?: number;
  /** Existing location zones already on the map */
  zones: LocationZone[];
  /** Available activity types for this place */
  activityTypes: { id: string; name: string; icon: string | null }[];
  onSaved?: () => void;
}

const DEFAULT_R = 32;
const ZONE_COLORS = [
  '#1565c0', '#2e7d32', '#c62828', '#e65100',
  '#6a1b9a', '#00695c', '#ad1457', '#4e342e',
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function PlaceMapEditor({
  placeId,
  mapImageUrl: initialImageUrl,
  mapWidth = 900,
  mapHeight = 600,
  zones: initialZones,
  activityTypes,
  onSaved,
}: PlaceMapEditorProps) {
  // Parse initial positions from svgMapData
  const parseZones = (zones: LocationZone[]) =>
    zones.map((z) => {
      if (z.svgMapData) {
        try {
          const d = JSON.parse(z.svgMapData) as { cx?: number; cy?: number; r?: number };
          return { ...z, cx: d.cx, cy: d.cy, r: d.r ?? DEFAULT_R };
        } catch { /* ignore */ }
      }
      return z;
    });

  const [zones, setZones] = useState<LocationZone[]>(() => parseZones(initialZones));
  const [imageUrl, setImageUrl] = useState(initialImageUrl ?? '');
  const [imageDirty, setImageDirty] = useState(false);

  // Use local state for map dimensions so they update when a new image is uploaded
  const [mapW, setMapW] = useState(mapWidth);
  const [mapH, setMapH] = useState(mapHeight);

  const [placing, setPlacing] = useState<string | null>(null); // zone id being placed
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ dx: 0, dy: 0 });

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New zone form
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneType, setNewZoneType] = useState(activityTypes[0]?.id ?? '');

  const svgRef = useRef<SVGSVGElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  // Re-sync if parent refreshes zones
  useEffect(() => {
    setZones(parseZones(initialZones));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialZones]);

  // ── Coordinate helpers ───────────────────────────────────────────────────

  const getSvgCoords = useCallback(
    (clientX: number, clientY: number) => {
      const el = svgRef.current;
      if (!el) return { x: 0, y: 0 };
      const rect = el.getBoundingClientRect();
      return {
        x: (clientX - rect.left) * (mapW / rect.width),
        y: (clientY - rect.top) * (mapH / rect.height),
      };
    },
    [mapW, mapH]
  );

  // ── SVG click — place selected zone ─────────────────────────────────────

  const handleSvgClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!placing) return;
      if ((e.target as Element).closest('[data-zone]')) return;
      const { x, y } = getSvgCoords(e.clientX, e.clientY);
      setZones((prev) =>
        prev.map((z) =>
          z.id === placing ? { ...z, cx: Math.round(x), cy: Math.round(y), r: z.r ?? DEFAULT_R } : z
        )
      );
      setPlacing(null);
    },
    [placing, getSvgCoords]
  );

  // ── Drag ─────────────────────────────────────────────────────────────────

  const handleZoneMouseDown = useCallback(
    (e: React.MouseEvent<SVGGElement>, zoneId: string) => {
      e.stopPropagation();
      if (placing) return;
      setDragging(zoneId);
      const zone = zones.find((z) => z.id === zoneId);
      if (!zone?.cx) return;
      const { x, y } = getSvgCoords(e.clientX, e.clientY);
      setDragOffset({ dx: x - zone.cx, dy: y - zone.cy! });
    },
    [placing, zones, getSvgCoords]
  );

  const handleSvgMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!dragging) return;
      const { x, y } = getSvgCoords(e.clientX, e.clientY);
      setZones((prev) =>
        prev.map((z) =>
          z.id === dragging
            ? { ...z, cx: Math.round(x - dragOffset.dx), cy: Math.round(y - dragOffset.dy) }
            : z
        )
      );
    },
    [dragging, getSvgCoords, dragOffset]
  );

  // ── Add a new (unsaved) zone ─────────────────────────────────────────────

  const handleAddZone = () => {
    if (!newZoneName.trim() || !newZoneType) return;
    const at = activityTypes.find((a) => a.id === newZoneType);
    const tempId = `new-${Date.now()}`;
    setZones((prev) => [
      ...prev,
      {
        id: tempId,
        name: newZoneName.trim(),
        activityTypeId: newZoneType,
        activityTypeName: at?.name ?? '',
        activityTypeIcon: at?.icon ?? null,
      },
    ]);
    setNewZoneName('');
    setPlacing(tempId); // immediately start placing
  };

  const removeZone = (id: string) => {
    setZones((prev) => prev.filter((z) => z.id !== id));
    if (placing === id) setPlacing(null);
  };

  // ── Map image upload (saves to place immediately) ──────────────────────

  const saveImageToPlace = async (url: string | null, width?: number, height?: number) => {
    setImageUploading(true);
    setImageError(null);
    try {
      const body: Record<string, unknown> = { mapImageUrl: url };
      if (width !== undefined) body.mapWidth = width;
      if (height !== undefined) body.mapHeight = height;
      const res = await fetch(`/api/places/${placeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to save image');
      setImageUrl(url ?? '');
      setImageDirty(false);
    } catch (e) {
      setImageError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setImageUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setImageError('Image must be under 10 MB');
      return;
    }
    setImageUploading(true);
    setImageError(null);
    try {
      const url = await uploadFileToS3(file, 'images/map');
      // Auto-detect natural image dimensions
      const dims = await new Promise<{ w: number; h: number }>((resolve) => {
        const img = new window.Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => resolve({ w: mapW, h: mapH });
        img.src = url;
      });
      setMapW(dims.w);
      setMapH(dims.h);
      await saveImageToPlace(url, dims.w, dims.h);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Upload failed');
      setImageUploading(false);
    }
    e.target.value = '';
  };

  const handleClearImage = () => saveImageToPlace(null);

  // ── Save ─────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const promises: Promise<Response>[] = [];

      // 1. Save/update the place map image URL + dimensions
      if (imageDirty) {
        promises.push(
          fetch(`/api/places/${placeId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mapImageUrl: imageUrl || null,
              mapWidth: mapW,
              mapHeight: mapH,
            }),
          })
        );
      }

      // 2. For each zone that has a position, save/create the ActivityLocation
      for (const zone of zones) {
        if (!zone.cx || !zone.cy) continue; // not placed yet — skip
        const svgMapData = JSON.stringify({ type: 'circle', cx: zone.cx, cy: zone.cy, r: zone.r ?? DEFAULT_R });

        if (zone.id.startsWith('new-')) {
          // Create new ActivityLocation
          promises.push(
            fetch('/api/activity-locations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                placeId,
                activityTypeId: zone.activityTypeId,
                name: zone.name,
                svgMapData,
                requiresSpot: true,
                mapWidth: mapW,
                mapHeight: mapH,
                mapImageUrl: imageUrl || undefined,
              }),
            })
          );
        } else {
          // Update existing ActivityLocation
          promises.push(
            fetch(`/api/activity-locations/${zone.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ svgMapData }),
            })
          );
        }
      }

      const results = await Promise.all(promises);
      const failed = results.filter((r) => !r.ok);
      if (failed.length) throw new Error(`${failed.length} item(s) failed to save`);

      setSaveSuccess(true);
      setImageDirty(false);
      setTimeout(() => setSaveSuccess(false), 3000);
      onSaved?.();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  const unplaced = zones.filter((z) => !z.cx);

  return (
    <Box>
      {/* ── Background image upload ───────────────────────────────── */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <MapIcon fontSize="small" /> Map Background Image
        </Typography>

        {imageError && (
          <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setImageError(null)}>{imageError}</Alert>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          {/* Thumbnail */}
          {imageUrl ? (
            <Box sx={{ width: 96, height: 64, borderRadius: 1, overflow: 'hidden', border: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="map preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
              {imageUrl ? 'Replace image' : 'Upload image'}
            </Button>
            {imageUrl && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<Clear />}
                onClick={handleClearImage}
                disabled={imageUploading}
                size="small"
              >
                Remove
              </Button>
            )}
          </Box>

          <Typography variant="caption" color="text.secondary">
            JPG, PNG or GIF &middot; max 5 MB &middot; stored in database
          </Typography>
        </Box>
      </Paper>

      <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
        {/* ── SVG canvas ─────────────────────────────────────────────── */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box
            sx={{
              border: '2px solid',
              borderColor: placing ? 'primary.main' : 'divider',
              borderRadius: 2,
              overflow: 'hidden',
              position: 'relative',
              bgcolor: '#f0ebe3',
              cursor: placing ? 'crosshair' : dragging ? 'grabbing' : 'default',
              transition: 'border-color 0.2s',
            }}
          >
            {placing && (
              <Box
                sx={{
                  position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
                  zIndex: 10, pointerEvents: 'none',
                }}
              >
                <Chip
                  label={`Click to place: ${zones.find((z) => z.id === placing)?.name ?? ''}`}
                  color="primary"
                  size="small"
                  icon={<MyLocation />}
                />
              </Box>
            )}

            <svg
              ref={svgRef}
              viewBox={`0 0 ${mapW} ${mapH}`}
              style={{ width: '100%', height: 'auto', display: 'block', maxHeight: 560, userSelect: 'none' }}
              onClick={handleSvgClick}
              onMouseMove={handleSvgMouseMove}
              onMouseUp={() => setDragging(null)}
              onMouseLeave={() => setDragging(null)}
            >
              {/* Background */}
              {imageUrl ? (
                <image href={imageUrl} x={0} y={0} width={mapW} height={mapH} preserveAspectRatio="xMidYMid slice" />
              ) : (
                <>
                  <rect x={0} y={0} width={mapW} height={mapH} fill="#e8e0d4" />
                  {Array.from({ length: Math.floor(mapW / 80) }, (_, i) => (
                    <line key={`v${i}`} x1={(i + 1) * 80} y1={0} x2={(i + 1) * 80} y2={mapH} stroke="rgba(0,0,0,0.07)" strokeWidth={1} />
                  ))}
                  {Array.from({ length: Math.floor(mapH / 80) }, (_, i) => (
                    <line key={`h${i}`} x1={0} y1={(i + 1) * 80} x2={mapW} y2={(i + 1) * 80} stroke="rgba(0,0,0,0.07)" strokeWidth={1} />
                  ))}
                  <text x={mapW / 2} y={mapH / 2} textAnchor="middle" dominantBaseline="middle" fill="rgba(0,0,0,0.2)" fontSize={16}>
                    Set a background image, then click to place location zones
                  </text>
                </>
              )}

              {/* Location zone markers */}
              {zones.map((zone, idx) => {
                if (!zone.cx || !zone.cy) return null;
                const color = ZONE_COLORS[idx % ZONE_COLORS.length];
                const r = zone.r ?? DEFAULT_R;
                const isDragging = dragging === zone.id;

                return (
                  <g
                    key={zone.id}
                    data-zone="true"
                    onMouseDown={(e) => handleZoneMouseDown(e, zone.id)}
                    style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                  >
                    {/* Shadow */}
                    <circle cx={zone.cx + 2} cy={zone.cy + 3} r={r} fill="rgba(0,0,0,0.15)" />
                    {/* Fill */}
                    <circle
                      cx={zone.cx} cy={zone.cy} r={r}
                      fill={color}
                      fillOpacity={0.85}
                      stroke={isDragging ? '#fff' : 'rgba(255,255,255,0.5)'}
                      strokeWidth={isDragging ? 3 : 2}
                    />
                    {/* Icon or initials */}
                    <text
                      x={zone.cx} y={zone.cy + 1}
                      textAnchor="middle" dominantBaseline="middle"
                      fill="white" fontSize={zone.activityTypeIcon ? r * 0.7 : r * 0.5}
                      fontWeight={700}
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {zone.activityTypeIcon ?? zone.name.slice(0, 2).toUpperCase()}
                    </text>
                    {/* Name label below */}
                    <text
                      x={zone.cx} y={zone.cy + r + 14}
                      textAnchor="middle" dominantBaseline="middle"
                      fill="rgba(0,0,0,0.8)" fontSize={12} fontWeight={700}
                      stroke="rgba(255,255,255,0.95)" strokeWidth={3} paintOrder="stroke"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {zone.name}
                    </text>
                    <title>{zone.name} — {zone.activityTypeName} — drag to reposition</title>
                  </g>
                );
              })}
            </svg>
          </Box>

          {/* Save bar */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1.5 }}>
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />}
              onClick={handleSave}
              disabled={saving}
            >
              Save Map
            </Button>
            {saveSuccess && <Chip label="Saved!" color="success" size="small" />}
            {saveError && <Typography variant="caption" color="error">{saveError}</Typography>}
            {unplaced.length > 0 && (
              <Typography variant="caption" color="warning.main" sx={{ ml: 'auto' }}>
                {unplaced.length} zone{unplaced.length > 1 ? 's' : ''} not yet placed
              </Typography>
            )}
          </Box>
        </Box>

        {/* ── Zone list + add form ────────────────────────────────────── */}
        <Box sx={{ width: { xs: '100%', md: 270 }, flexShrink: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Location Zones</Typography>

          {/* Add new zone */}
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Add a location zone
            </Typography>
            <Stack spacing={1}>
              <TextField
                label="Zone name"
                value={newZoneName}
                onChange={(e) => setNewZoneName(e.target.value)}
                size="small"
                fullWidth
                placeholder="e.g. Fishing Zone A"
                onKeyDown={(e) => e.key === 'Enter' && handleAddZone()}
              />
              {activityTypes.length > 0 && (
                <TextField
                  label="Activity type"
                  select
                  value={newZoneType}
                  onChange={(e) => setNewZoneType(e.target.value)}
                  size="small"
                  fullWidth
                >
                  {activityTypes.map((at) => (
                    <MenuItem key={at.id} value={at.id}>
                      {at.icon && <Typography component="span" sx={{ mr: 0.75 }}>{at.icon}</Typography>}
                      {at.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
              <Button
                variant="outlined"
                size="small"
                startIcon={<Add />}
                onClick={handleAddZone}
                disabled={!newZoneName.trim() || !newZoneType}
                fullWidth
              >
                Add &amp; Place on Map
              </Button>
            </Stack>
          </Paper>

          {/* Zone list */}
          <Stack spacing={1}>
            {zones.length === 0 && (
              <Alert severity="info" sx={{ fontSize: '0.78rem' }}>
                Add location zones above, then click the map to place each one.
              </Alert>
            )}
            {zones.map((zone, idx) => {
              const color = ZONE_COLORS[idx % ZONE_COLORS.length];
              const isPlacing = placing === zone.id;
              const isOnMap = !!(zone.cx && zone.cy);

              return (
                <Paper
                  key={zone.id}
                  variant="outlined"
                  sx={{
                    p: 1.25, borderRadius: 1.5,
                    borderColor: isPlacing ? 'primary.main' : isOnMap ? 'success.light' : 'divider',
                    transition: 'border-color 0.2s',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.82rem' }} noWrap>
                        {zone.activityTypeIcon} {zone.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {zone.activityTypeName}
                      </Typography>
                    </Box>
                    <Tooltip title="Delete zone">
                      <IconButton size="small" color="error" onClick={() => removeZone(zone.id)} sx={{ p: 0.25 }}>
                        <Delete fontSize="inherit" />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  <Box sx={{ mt: 0.75, display: 'flex', gap: 0.5 }}>
                    {isOnMap ? (
                      <>
                        <Chip label="On map" color="success" size="small" sx={{ fontSize: '0.7rem', height: 20 }} />
                        <Button
                          size="small" variant="text"
                          sx={{ fontSize: '0.7rem', py: 0, px: 0.75, minWidth: 0, height: 20 }}
                          onClick={() => setPlacing(zone.id)}
                        >
                          Reposition
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="small"
                        variant={isPlacing ? 'contained' : 'outlined'}
                        color="primary"
                        startIcon={<MyLocation sx={{ fontSize: '12px !important' }} />}
                        sx={{ fontSize: '0.7rem', py: 0, px: 1, height: 22 }}
                        onClick={() => setPlacing(isPlacing ? null : zone.id)}
                      >
                        {isPlacing ? 'Click map…' : 'Place on map'}
                      </Button>
                    )}
                  </Box>
                </Paper>
              );
            })}
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
