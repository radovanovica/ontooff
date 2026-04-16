'use client';

/**
 * SearchMap
 * Interactive Leaflet map for the search page.
 * - Fires onBoundsChange (debounced in the parent) when the user pans/zooms
 * - Highlights a pin when highlightedId changes
 * - Clicking a pin opens an overlay preview panel; onPinClick is still fired
 *   for sidebar list highlighting
 */

import { useEffect, useRef, useState } from 'react';
import { Box, Typography, Button, IconButton } from '@mui/material';
import { Close } from '@mui/icons-material';
import type { MapPin } from '@/app/search/page';

interface SearchMapProps {
  pins: MapPin[];
  highlightedId: string | null;
  onBoundsChange: (bbox: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  }) => void;
  onPinClick?: (id: string) => void;
}

export default function SearchMap({
  pins,
  highlightedId,
  onBoundsChange,
  onPinClick,
}: SearchMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<Map<string, any>>(new Map());
  const initializedRef = useRef(false);

  const [previewPin, setPreviewPin] = useState<MapPin | null>(null);

  // ── Initialize map once ──────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;
    initializedRef.current = true;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require('leaflet') as typeof import('leaflet');

    // Fix broken default icon paths
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const map = L.map(containerRef.current, {
      center: [48.0, 16.0], // start at a central European view
      zoom: 5,
      zoomControl: true,
    });

    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Fire bounds on moveend
    map.on('moveend', () => {
      const b = map.getBounds();
      onBoundsChange({
        minLat: b.getSouth(),
        maxLat: b.getNorth(),
        minLng: b.getWest(),
        maxLng: b.getEast(),
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
      initializedRef.current = false;
    };
    // onBoundsChange is stable (useCallback in parent)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Update markers when pins change ─────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require('leaflet') as typeof import('leaflet');

    // Remove markers that are no longer in the pins list
    const currentIds = new Set(pins.map((p) => p.id));
    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    // Add or update markers
    pins.forEach((pin) => {
      const isHighlighted = pin.highlighted ?? false;
      const color = pin.color ?? '#1976d2';
      const size = isHighlighted ? 40 : 32;
      const border = isHighlighted ? 4 : 3;

      const labelHtml = `<div style="
        position:absolute;
        bottom:${size + 6}px;
        left:50%;
        transform:translateX(-50%);
        white-space:nowrap;
        font-family:sans-serif;
        font-size:${isHighlighted ? 12 : 11}px;
        font-weight:700;
        color:#fff;
        background:rgba(0,0,0,0.62);
        border-radius:4px;
        padding:2px 6px;
        pointer-events:none;
        box-shadow:0 1px 4px rgba(0,0,0,0.3);
      ">${pin.name}</div>`;

      const icon = L.divIcon({
        className: '',
        html: `
          <div style="position:relative;width:${size}px;height:${size + 28}px;">
            ${labelHtml}
            <div style="
              position:absolute;bottom:0;left:0;
              background:${color};
              width:${size}px;height:${size}px;
              border-radius:50% 50% 50% 0;
              transform:rotate(-45deg);
              border:${border}px solid white;
              box-shadow:0 ${isHighlighted ? 4 : 2}px ${isHighlighted ? 12 : 6}px rgba(0,0,0,${isHighlighted ? 0.5 : 0.35});
              display:flex;align-items:center;justify-content:center;
              transition:all 0.15s;
            ">
              <div style="
                width:${isHighlighted ? 10 : 8}px;height:${isHighlighted ? 10 : 8}px;
                background:white;border-radius:50%;
                transform:rotate(45deg);
              "></div>
            </div>
          </div>`,
        iconSize: [size, size + 28],
        iconAnchor: [size / 2, size + 28],
        popupAnchor: [0, -(size + 32)],
      });

      if (markersRef.current.has(pin.id)) {
        // Update existing marker icon (for highlight changes)
        const existing = markersRef.current.get(pin.id);
        existing.setIcon(icon);
      } else {
        // Create new marker
        const marker = L.marker([pin.latitude, pin.longitude], { icon });
        marker.on('click', () => {
          setPreviewPin(pin);
          onPinClick?.(pin.id);
        });
        marker.addTo(map);
        markersRef.current.set(pin.id, marker);
      }
    });

    // Fit map to pins if we have them and map hasn't been moved by user yet
    if (pins.length > 0 && map.getZoom() === 5 && map.getCenter().equals([48.0, 16.0])) {
      const group = L.featureGroup(Array.from(markersRef.current.values()));
      map.fitBounds(group.getBounds().pad(0.2), { maxZoom: 13 });
    }
  }, [pins, onPinClick]);

  // ── Fly to highlighted pin ───────────────────────────────────────────────
  useEffect(() => {
    if (!highlightedId || !mapRef.current) return;
    const marker = markersRef.current.get(highlightedId) ??
      markersRef.current.get(`free__${highlightedId}`);
    if (marker) {
      const latlng = marker.getLatLng();
      mapRef.current.panTo(latlng, { animate: true, duration: 0.5 });
    }
  }, [highlightedId]);

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <Box
        ref={containerRef}
        sx={{
          width: '100%',
          height: '100%',
          '& .leaflet-container': { height: '100%', width: '100%' },
        }}
      />

      {/* ── Place preview overlay ──────────────────────────────────── */}
      {previewPin && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: 6,
            width: 280,
            overflow: 'hidden',
          }}
        >
          {/* Close */}
          <IconButton
            size="small"
            onClick={() => setPreviewPin(null)}
            sx={{ position: 'absolute', top: 4, right: 4, zIndex: 1, bgcolor: 'rgba(255,255,255,0.85)', '&:hover': { bgcolor: 'white' } }}
          >
            <Close fontSize="small" />
          </IconButton>

          {/* Cover image */}
          {previewPin.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewPin.coverUrl}
              alt={previewPin.name}
              style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <Box sx={{ height: 80, bgcolor: 'grey.100', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="body2" color="text.disabled">{previewPin.name.slice(0, 1)}</Typography>
            </Box>
          )}

          {/* Info */}
          <Box sx={{ p: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.25 }} noWrap>
              {previewPin.name}
            </Typography>
            {previewPin.description && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {previewPin.description}
              </Typography>
            )}
            {previewPin.href && (
              <Button
                component="a"
                href={previewPin.href}
                variant="contained"
                size="small"
                fullWidth
                sx={{ mt: 0.5, textDecoration: 'none' }}
              >
                View
              </Button>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}


