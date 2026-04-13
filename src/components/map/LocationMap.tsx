'use client';

/**
 * LocationMap
 * Shows activity locations as pins on an OpenStreetMap (Leaflet).
 * Dynamically imported (no SSR) to avoid window-is-not-defined errors.
 */

import { useEffect, useRef } from 'react';
import { Box } from '@mui/material';

export interface LocationPin {
  id: string;
  name: string;
  description?: string | null;
  latitude: number;
  longitude: number;
  color?: string;
}

interface LocationMapProps {
  pins: LocationPin[];
  /** Center point — defaults to average of all pins */
  center?: [number, number];
  zoom?: number;
  height?: number | string;
  onPinClick?: (id: string) => void;
}

export default function LocationMap({
  pins,
  center,
  zoom = 14,
  height = 380,
  onPinClick,
}: LocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Store the map instance so we can destroy it on unmount
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || pins.length === 0) return;

    // Leaflet must be imported client-side only
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require('leaflet') as typeof import('leaflet');

    // Fix broken default marker icon paths caused by webpack bundling
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    // Destroy previous map instance if re-rendering
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const calcCenter: [number, number] = center ?? [
      pins.reduce((s, p) => s + p.latitude, 0) / pins.length,
      pins.reduce((s, p) => s + p.longitude, 0) / pins.length,
    ];

    const map = L.map(containerRef.current, {
      center: calcCenter,
      zoom,
      scrollWheelZoom: false,
    });
    mapRef.current = map;

    // OpenStreetMap tiles — free, no API key
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    pins.forEach((pin) => {
      // Custom colored div-icon
      const color = pin.color ?? '#2d5a27';
      const icon = L.divIcon({
        className: '',
        html: `
          <div style="
            background:${color};
            width:32px;height:32px;
            border-radius:50% 50% 50% 0;
            transform:rotate(-45deg);
            border:3px solid white;
            box-shadow:0 2px 6px rgba(0,0,0,0.35);
            display:flex;align-items:center;justify-content:center;
          ">
            <div style="
              width:8px;height:8px;
              background:white;
              border-radius:50%;
              transform:rotate(45deg);
            "></div>
          </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -36],
      });

      const marker = L.marker([pin.latitude, pin.longitude], { icon });

      const popupHtml = `
        <div style="min-width:140px;font-family:sans-serif;">
          <div style="font-weight:700;font-size:13px;margin-bottom:4px;">${pin.name}</div>
          ${pin.description ? `<div style="font-size:12px;color:#555;line-height:1.4;">${pin.description}</div>` : ''}
        </div>`;
      marker.bindPopup(popupHtml);

      if (onPinClick) {
        marker.on('click', () => onPinClick(pin.id));
      }

      marker.addTo(map);
    });

    // If only one pin, open its popup automatically
    if (pins.length === 1) {
      map.eachLayer((layer) => {
        if ((layer as L.Marker).getPopup) {
          (layer as L.Marker).openPopup?.();
        }
      });
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins, center, zoom]);

  if (pins.length === 0) return null;

  return (
    <Box
      ref={containerRef}
      sx={{
        width: '100%',
        height,
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        '& .leaflet-container': { height: '100%', width: '100%' },
      }}
    />
  );
}
