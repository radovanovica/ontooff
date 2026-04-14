'use client';

/**
 * SearchMap
 * Interactive Leaflet map for the search page.
 * - Fires onBoundsChange (debounced in the parent) when the user pans/zooms
 * - Highlights a pin when highlightedId changes
 * - Clicking a pin calls onPinClick(id)
 */

import { useEffect, useRef } from 'react';
import { Box } from '@mui/material';
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

      const icon = L.divIcon({
        className: '',
        html: `
          <div style="
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
          </div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size],
        popupAnchor: [0, -(size + 4)],
      });

      if (markersRef.current.has(pin.id)) {
        // Update existing marker icon (for highlight changes)
        const existing = markersRef.current.get(pin.id);
        existing.setIcon(icon);
      } else {
        // Create new marker
        const marker = L.marker([pin.latitude, pin.longitude], { icon });
        marker.bindPopup(
          `<div style="min-width:130px;font-family:sans-serif;">
            <div style="font-weight:700;font-size:13px;margin-bottom:3px;">${pin.name}</div>
            ${pin.description ? `<div style="font-size:12px;color:#666;">${pin.description}</div>` : ''}
           </div>`
        );
        if (onPinClick) {
          marker.on('click', () => {
            marker.openPopup();
            onPinClick(pin.id);
          });
        }
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
      marker.openPopup();
    }
  }, [highlightedId]);

  return (
    <Box
      ref={containerRef}
      sx={{
        width: '100%',
        height: '100%',
        '& .leaflet-container': { height: '100%', width: '100%' },
      }}
    />
  );
}
