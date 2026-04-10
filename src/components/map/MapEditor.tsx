'use client';

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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Stack,
  MenuItem,
} from '@mui/material';
import {
  Delete,
  Edit,
  Add,
  Save,
  MyLocation,
  Map as MapIcon,
  UploadFile,
  Clear,
} from '@mui/icons-material';
import { useState, useRef, useCallback, useEffect } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MapSpot {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  maxPeople: number;
  status: string;
  amenities: string[];
  svgShapeData?: string | null;
  /** Position on map — null if not placed yet */
  cx?: number;
  cy?: number;
  r?: number;
}

interface PlacedMarker {
  spotId: string;
  cx: number;
  cy: number;
  r: number;
}

interface EditingSpot {
  id: string | null; // null = new spot
  name: string;
  code: string;
  description: string;
  maxPeople: number;
  status: string;
}

interface MapEditorProps {
  locationId: string;
  spots: MapSpot[];
  mapImageUrl?: string | null;
  mapWidth?: number;
  mapHeight?: number;
  onSpotsUpdated: () => void;
  onMapImageChange?: (url: string) => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_RADIUS = 18;
const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: '#4caf50',
  OCCUPIED: '#f44336',
  MAINTENANCE: '#9e9e9e',
  DISABLED: '#bdbdbd',
};

// ─── MapEditor ────────────────────────────────────────────────────────────────

export default function MapEditor({
  locationId,
  spots,
  mapImageUrl,
  mapWidth = 800,
  mapHeight = 600,
  onSpotsUpdated,
  onMapImageChange,
}: MapEditorProps) {
  // ── Marker state (local positions, derived from spots' svgShapeData) ──────
  const [markers, setMarkers] = useState<PlacedMarker[]>(() =>
    spots
      .filter((s) => s.svgShapeData)
      .map((s) => {
        try {
          const shape = JSON.parse(s.svgShapeData!) as { cx?: number; cy?: number; r?: number };
          if (typeof shape.cx === 'number' && typeof shape.cy === 'number') {
            return { spotId: s.id, cx: shape.cx, cy: shape.cy, r: shape.r ?? DEFAULT_RADIUS };
          }
        } catch {
          // ignore
        }
        return null;
      })
      .filter(Boolean) as PlacedMarker[]
  );

  // Re-sync markers when spots prop changes (after a reload)
  useEffect(() => {
    setMarkers(
      spots
        .filter((s) => s.svgShapeData)
        .map((s) => {
          try {
            const shape = JSON.parse(s.svgShapeData!) as { cx?: number; cy?: number; r?: number };
            if (typeof shape.cx === 'number' && typeof shape.cy === 'number') {
              return { spotId: s.id, cx: shape.cx, cy: shape.cy, r: shape.r ?? DEFAULT_RADIUS };
            }
          } catch {
            // ignore
          }
          return null;
        })
        .filter(Boolean) as PlacedMarker[]
    );
  }, [spots]);

  const [placing, setPlacing] = useState<string | null>(null); // spotId being placed
  const [dragging, setDragging] = useState<string | null>(null); // spotId being dragged
  const [dragOffset, setDragOffset] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Spot CRUD dialog
  const [spotDialog, setSpotDialog] = useState(false);
  const [editingSpot, setEditingSpot] = useState<EditingSpot>({
    id: null,
    name: '',
    code: '',
    description: '',
    maxPeople: 1,
    status: 'AVAILABLE',
  });
  const [spotSaving, setSpotSaving] = useState(false);
  const [spotError, setSpotError] = useState<string | null>(null);

  // Map image URL editing
  const [imageUrl, setImageUrl] = useState(mapImageUrl ?? '');
  const [imageUrlDirty, setImageUrlDirty] = useState(false);

  // Sync when parent passes a new mapImageUrl (e.g. after settings save)
  useEffect(() => {
    setImageUrl(mapImageUrl ?? '');
    setImageUrlDirty(false);
  }, [mapImageUrl]);

  const svgRef = useRef<SVGSVGElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Coordinate helpers ───────────────────────────────────────────────────

  const getSvgCoords = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      const svgEl = svgRef.current;
      if (!svgEl) return { x: 0, y: 0 };
      const rect = svgEl.getBoundingClientRect();
      const scaleX = mapWidth / rect.width;
      const scaleY = mapHeight / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    },
    [mapWidth, mapHeight]
  );

  // ── SVG click — place the spot being placed ──────────────────────────────

  const handleSvgClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!placing) return;
      // Ignore if clicking an existing marker
      if ((e.target as Element).closest('[data-marker]')) return;

      const { x, y } = getSvgCoords(e.clientX, e.clientY);
      setMarkers((prev) => {
        const existing = prev.findIndex((m) => m.spotId === placing);
        if (existing >= 0) {
          const next = [...prev];
          next[existing] = { ...next[existing], cx: x, cy: y };
          return next;
        }
        return [...prev, { spotId: placing, cx: x, cy: y, r: DEFAULT_RADIUS }];
      });
      setPlacing(null);
    },
    [placing, getSvgCoords]
  );

  // ── Drag ─────────────────────────────────────────────────────────────────

  const handleMarkerMouseDown = useCallback(
    (e: React.MouseEvent<SVGGElement>, spotId: string) => {
      e.stopPropagation();
      if (placing) return;
      setDragging(spotId);
      const marker = markers.find((m) => m.spotId === spotId);
      if (!marker) return;
      const { x, y } = getSvgCoords(e.clientX, e.clientY);
      setDragOffset({ dx: x - marker.cx, dy: y - marker.cy });
    },
    [placing, markers, getSvgCoords]
  );

  const handleSvgMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!dragging) return;
      const { x, y } = getSvgCoords(e.clientX, e.clientY);
      setMarkers((prev) =>
        prev.map((m) =>
          m.spotId === dragging
            ? { ...m, cx: x - dragOffset.dx, cy: y - dragOffset.dy }
            : m
        )
      );
    },
    [dragging, getSvgCoords, dragOffset]
  );

  const handleSvgMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  // ── Remove marker from map (don't delete the spot) ───────────────────────

  const removeMarker = useCallback((spotId: string) => {
    setMarkers((prev) => prev.filter((m) => m.spotId !== spotId));
  }, []);

  // ── Save all marker positions ────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      // Build a set of spot IDs currently on the map
      const onMap = new Set(markers.map((m) => m.spotId));

      // For spots NOT on map, clear their svgShapeData
      const clearPromises = spots
        .filter((s) => s.svgShapeData && !onMap.has(s.id))
        .map((s) =>
          fetch('/api/spots', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: s.id, svgShapeData: null }),
          })
        );

      // For spots on map, update svgShapeData with new position
      const updatePromises = markers.map((m) =>
        fetch('/api/spots', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: m.spotId,
            svgShapeData: JSON.stringify({ type: 'circle', cx: Math.round(m.cx), cy: Math.round(m.cy), r: m.r }),
          }),
        })
      );

      const results = await Promise.all([...clearPromises, ...updatePromises]);
      const failed = results.filter((r) => !r.ok);
      if (failed.length > 0) throw new Error(`${failed.length} spot(s) failed to save`);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      onSpotsUpdated();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // ── Spot CRUD ────────────────────────────────────────────────────────────

  const openAddSpot = () => {
    setEditingSpot({ id: null, name: '', code: '', description: '', maxPeople: 1, status: 'AVAILABLE' });
    setSpotError(null);
    setSpotDialog(true);
  };

  const openEditSpot = (spot: MapSpot) => {
    setEditingSpot({
      id: spot.id,
      name: spot.name,
      code: spot.code ?? '',
      description: spot.description ?? '',
      maxPeople: spot.maxPeople,
      status: spot.status,
    });
    setSpotError(null);
    setSpotDialog(true);
  };

  const handleSpotSave = async () => {
    if (!editingSpot.name.trim()) {
      setSpotError('Name is required');
      return;
    }
    setSpotSaving(true);
    setSpotError(null);
    try {
      if (editingSpot.id) {
        const res = await fetch('/api/spots', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingSpot.id,
            name: editingSpot.name,
            code: editingSpot.code || undefined,
            description: editingSpot.description || undefined,
            maxPeople: editingSpot.maxPeople,
            status: editingSpot.status,
          }),
        });
        if (!res.ok) throw new Error('Failed to update spot');
      } else {
        const res = await fetch('/api/spots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            activityLocationId: locationId,
            name: editingSpot.name,
            code: editingSpot.code || undefined,
            description: editingSpot.description || undefined,
            maxPeople: editingSpot.maxPeople,
            status: editingSpot.status,
          }),
        });
        if (!res.ok) throw new Error('Failed to create spot');
      }
      setSpotDialog(false);
      onSpotsUpdated();
    } catch (err) {
      setSpotError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSpotSaving(false);
    }
  };

  const handleDeleteSpot = async (spotId: string) => {
    if (!confirm('Delete this spot? This cannot be undone.')) return;
    await fetch('/api/spots', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: spotId }),
    });
    setMarkers((prev) => prev.filter((m) => m.spotId !== spotId));
    onSpotsUpdated();
  };

  // ── Map image: file → base64 → save ────────────────────────────────────────

  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const saveImageToDb = async (base64: string | null) => {
    setImageUploading(true);
    setImageError(null);
    try {
      const res = await fetch(`/api/activity-locations/${locationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapImageUrl: base64 }),
      });
      if (!res.ok) throw new Error('Failed to save image');
      setImageUrl(base64 ?? '');
      setImageUrlDirty(false);
      onMapImageChange?.(base64 ?? '');
    } catch (e) {
      setImageError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setImageUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setImageError('Image must be under 5 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => saveImageToDb(reader.result as string);
    reader.onerror = () => setImageError('Failed to read file');
    reader.readAsDataURL(file);
    // reset input so the same file can be re-selected
    e.target.value = '';
  };

  const handleClearImage = () => saveImageToDb(null);

  // ─────────────────────────────────────────────────────────────────────────

  const unplacedSpots = spots.filter((s) => !markers.some((m) => m.spotId === s.id));

  return (
    <Box>
      {/* ── Background image upload ────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <MapIcon fontSize="small" /> Background Map Image
        </Typography>

        {imageError && (
          <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setImageError(null)}>{imageError}</Alert>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          {/* Thumbnail */}
          {imageUrl ? (
            <Box
              sx={{
                width: 96, height: 64, borderRadius: 1, overflow: 'hidden',
                border: '1px solid', borderColor: 'divider', flexShrink: 0,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="map preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </Box>
          ) : (
            <Box
              sx={{
                width: 96, height: 64, borderRadius: 1, border: '1px dashed',
                borderColor: 'divider', display: 'flex', alignItems: 'center',
                justifyContent: 'center', flexShrink: 0, bgcolor: 'action.hover',
              }}
            >
              <MapIcon sx={{ color: 'text.disabled', fontSize: 28 }} />
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
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

      {/* ── Canvas ─────────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
        {/* SVG map */}
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
                  position: 'absolute',
                  top: 8,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 10,
                  pointerEvents: 'none',
                }}
              >
                <Chip
                  label={`Click to place: ${spots.find((s) => s.id === placing)?.name ?? ''}`}
                  color="primary"
                  size="small"
                  icon={<MyLocation />}
                />
              </Box>
            )}

            <svg
              ref={svgRef}
              viewBox={`0 0 ${mapWidth} ${mapHeight}`}
              style={{ width: '100%', height: 'auto', display: 'block', maxHeight: 600, userSelect: 'none' }}
              onClick={handleSvgClick}
              onMouseMove={handleSvgMouseMove}
              onMouseUp={handleSvgMouseUp}
              onMouseLeave={handleSvgMouseUp}
            >
              {/* Background */}
              {imageUrl ? (
                <image
                  href={imageUrl}
                  x={0}
                  y={0}
                  width={mapWidth}
                  height={mapHeight}
                  preserveAspectRatio="xMidYMid slice"
                />
              ) : (
                <rect x={0} y={0} width={mapWidth} height={mapHeight} fill="#e8e0d4" />
              )}

              {/* Grid hint when no image */}
              {!imageUrl && (
                <>
                  {Array.from({ length: Math.floor(mapWidth / 80) }, (_, i) => (
                    <line
                      key={`vg-${i}`}
                      x1={(i + 1) * 80}
                      y1={0}
                      x2={(i + 1) * 80}
                      y2={mapHeight}
                      stroke="rgba(0,0,0,0.08)"
                      strokeWidth={1}
                    />
                  ))}
                  {Array.from({ length: Math.floor(mapHeight / 80) }, (_, i) => (
                    <line
                      key={`hg-${i}`}
                      x1={0}
                      y1={(i + 1) * 80}
                      x2={mapWidth}
                      y2={(i + 1) * 80}
                      stroke="rgba(0,0,0,0.08)"
                      strokeWidth={1}
                    />
                  ))}
                  <text x={mapWidth / 2} y={mapHeight / 2} textAnchor="middle" dominantBaseline="middle" fill="rgba(0,0,0,0.25)" fontSize={18}>
                    Set a background image or drag spots here
                  </text>
                </>
              )}

              {/* Placed spot markers */}
              {markers.map((marker) => {
                const spot = spots.find((s) => s.id === marker.spotId);
                if (!spot) return null;
                const color = STATUS_COLORS[spot.status] ?? '#4caf50';
                const isDraggingThis = dragging === marker.spotId;

                return (
                  <g
                    key={marker.spotId}
                    data-marker="true"
                    onMouseDown={(e) => handleMarkerMouseDown(e, marker.spotId)}
                    style={{ cursor: isDraggingThis ? 'grabbing' : 'grab' }}
                  >
                    {/* Shadow */}
                    <circle
                      cx={marker.cx + 2}
                      cy={marker.cy + 3}
                      r={marker.r}
                      fill="rgba(0,0,0,0.18)"
                    />
                    {/* Fill */}
                    <circle
                      cx={marker.cx}
                      cy={marker.cy}
                      r={marker.r}
                      fill={color}
                      stroke={isDraggingThis ? '#fff' : 'rgba(0,0,0,0.2)'}
                      strokeWidth={isDraggingThis ? 3 : 1.5}
                    />
                    {/* Label */}
                    <text
                      x={marker.cx}
                      y={marker.cy + 1}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize={marker.r * 0.65}
                      fontWeight={700}
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {(spot.code || spot.name).slice(0, 4)}
                    </text>
                    {/* Name below marker */}
                    <text
                      x={marker.cx}
                      y={marker.cy + marker.r + 13}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="rgba(0,0,0,0.75)"
                      fontSize={11}
                      fontWeight={600}
                      stroke="rgba(255,255,255,0.9)"
                      strokeWidth={3}
                      paintOrder="stroke"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {spot.name}
                    </text>
                    <title>{spot.name} — drag to reposition</title>
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
              Save Map Positions
            </Button>
            {saveSuccess && <Chip label="Saved!" color="success" size="small" />}
            {saveError && <Typography variant="caption" color="error">{saveError}</Typography>}
            <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
              Drag markers to reposition
            </Typography>
          </Box>
        </Box>

        {/* ── Spot list ──────────────────────────────────────────────── */}
        <Box sx={{ width: { xs: '100%', md: 260 }, flexShrink: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Spots</Typography>
            <Button size="small" startIcon={<Add />} onClick={openAddSpot} variant="outlined">
              Add
            </Button>
          </Box>

          <Stack spacing={1}>
            {spots.length === 0 && (
              <Alert severity="info" sx={{ fontSize: '0.78rem' }}>
                No spots yet. Add spots and place them on the map.
              </Alert>
            )}
            {spots.map((spot) => {
              const marker = markers.find((m) => m.spotId === spot.id);
              const isPlacing = placing === spot.id;
              const isOnMap = !!marker;

              return (
                <Paper
                  key={spot.id}
                  variant="outlined"
                  sx={{
                    p: 1.25,
                    borderRadius: 1.5,
                    borderColor: isPlacing ? 'primary.main' : isOnMap ? 'success.light' : 'divider',
                    bgcolor: isPlacing ? 'primary.50' : 'background.paper',
                    transition: 'border-color 0.2s',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        bgcolor: STATUS_COLORS[spot.status] ?? '#4caf50',
                        flexShrink: 0,
                      }}
                    />
                    <Typography variant="body2" sx={{ fontWeight: 600, flexGrow: 1, fontSize: '0.82rem' }} noWrap>
                      {spot.name}
                      {spot.code && (
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                          ({spot.code})
                        </Typography>
                      )}
                    </Typography>
                    <Tooltip title="Edit spot details">
                      <IconButton size="small" onClick={() => openEditSpot(spot)} sx={{ p: 0.25 }}>
                        <Edit fontSize="inherit" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete spot">
                      <IconButton size="small" color="error" onClick={() => handleDeleteSpot(spot.id)} sx={{ p: 0.25 }}>
                        <Delete fontSize="inherit" />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 0.5, mt: 0.75, flexWrap: 'wrap' }}>
                    {isOnMap ? (
                      <>
                        <Chip label="On map" color="success" size="small" sx={{ fontSize: '0.7rem', height: 20 }} />
                        <Button
                          size="small"
                          variant="text"
                          sx={{ fontSize: '0.7rem', py: 0, px: 0.75, minWidth: 0, height: 20 }}
                          onClick={() => setPlacing(spot.id)}
                        >
                          Reposition
                        </Button>
                        <Button
                          size="small"
                          variant="text"
                          color="error"
                          sx={{ fontSize: '0.7rem', py: 0, px: 0.75, minWidth: 0, height: 20 }}
                          onClick={() => removeMarker(spot.id)}
                        >
                          Remove
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="small"
                        variant={isPlacing ? 'contained' : 'outlined'}
                        color="primary"
                        startIcon={<MyLocation sx={{ fontSize: '12px !important' }} />}
                        sx={{ fontSize: '0.7rem', py: 0, px: 1, height: 22 }}
                        onClick={() => setPlacing(isPlacing ? null : spot.id)}
                      >
                        {isPlacing ? 'Click map to place' : 'Place on map'}
                      </Button>
                    )}
                  </Box>
                </Paper>
              );
            })}
          </Stack>

          {unplacedSpots.length > 0 && (
            <Alert severity="warning" sx={{ mt: 1.5, fontSize: '0.75rem' }}>
              {unplacedSpots.length} spot{unplacedSpots.length > 1 ? 's' : ''} not yet placed on map
            </Alert>
          )}
        </Box>
      </Box>

      {/* ── Spot Edit Dialog ───────────────────────────────────────────── */}
      <Dialog open={spotDialog} onClose={() => setSpotDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editingSpot.id ? 'Edit Spot' : 'Add Spot'}</DialogTitle>
        <DialogContent>
          {spotError && <Alert severity="error" sx={{ mb: 2 }}>{spotError}</Alert>}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 8 }}>
              <TextField
                label="Name *"
                value={editingSpot.name}
                onChange={(e) => setEditingSpot((p) => ({ ...p, name: e.target.value }))}
                fullWidth
                size="small"
                autoFocus
              />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField
                label="Code"
                value={editingSpot.code}
                onChange={(e) => setEditingSpot((p) => ({ ...p, code: e.target.value }))}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Description"
                value={editingSpot.description}
                onChange={(e) => setEditingSpot((p) => ({ ...p, description: e.target.value }))}
                fullWidth
                size="small"
                multiline
                rows={2}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                label="Max people"
                type="number"
                value={editingSpot.maxPeople}
                onChange={(e) => setEditingSpot((p) => ({ ...p, maxPeople: Number(e.target.value) }))}
                fullWidth
                size="small"
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                label="Status"
                select
                value={editingSpot.status}
                onChange={(e) => setEditingSpot((p) => ({ ...p, status: e.target.value }))}
                fullWidth
                size="small"
              >
                <MenuItem value="AVAILABLE">Available</MenuItem>
                <MenuItem value="OCCUPIED">Occupied</MenuItem>
                <MenuItem value="MAINTENANCE">Maintenance</MenuItem>
                <MenuItem value="DISABLED">Disabled</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setSpotDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSpotSave} disabled={spotSaving}>
            {spotSaving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
