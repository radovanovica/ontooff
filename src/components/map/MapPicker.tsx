'use client';

/**
 * MapPicker
 * An interactive Leaflet map for picking a GPS coordinate.
 * - Type an address and press Enter / click Search → geocodes via Nominatim
 * - Click anywhere on the map to move the pin
 * - Drag the marker to fine-tune
 * - Confirm sends the (lat, lng) pair to the parent; Cancel dismisses
 *
 * Rendered client-side only (dynamic import with ssr:false).
 */

import { useEffect, useRef, useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Search, MyLocation } from '@mui/icons-material';

interface MapPickerProps {
  initialLat?: number;
  initialLng?: number;
  onConfirm: (lat: number, lng: number) => void;
  onCancel: () => void;
}

// Default map center (Belgrade, Serbia – change to your region if desired)
const DEFAULT_LAT = 44.8176;
const DEFAULT_LNG = 20.4633;
const DEFAULT_ZOOM = 13;

export default function MapPicker({ initialLat, initialLng, onConfirm, onCancel }: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);

  const [lat, setLat] = useState<number>(initialLat ?? DEFAULT_LAT);
  const [lng, setLng] = useState<number>(initialLng ?? DEFAULT_LNG);
  const [hasPin, setHasPin] = useState<boolean>(initialLat != null && initialLng != null);

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Initialise Leaflet map
  useEffect(() => {
    if (!containerRef.current) return;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require('leaflet') as typeof import('leaflet');

    // Fix webpack broken default icon paths
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const centerLat = initialLat ?? DEFAULT_LAT;
    const centerLng = initialLng ?? DEFAULT_LNG;

    const map = L.map(containerRef.current, {
      center: [centerLat, centerLng],
      zoom: initialLat != null ? 15 : DEFAULT_ZOOM,
    });
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Create a draggable marker — only if we have an initial pin
    const pinIcon = L.divIcon({
      className: '',
      html: `<div style="width:28px;height:28px;background:#d32f2f;border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
    });

    if (initialLat != null && initialLng != null) {
      const marker = L.marker([initialLat, initialLng], { draggable: true, icon: pinIcon }).addTo(map);
      markerRef.current = marker;
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        setLat(pos.lat);
        setLng(pos.lng);
      });
    }

    // Click on map → move/place the pin
    map.on('click', (e: import('leaflet').LeafletMouseEvent) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;
      setLat(clickLat);
      setLng(clickLng);
      setHasPin(true);

      if (markerRef.current) {
        markerRef.current.setLatLng([clickLat, clickLng]);
      } else {
        const marker = L.marker([clickLat, clickLng], { draggable: true, icon: pinIcon }).addTo(map);
        markerRef.current = marker;
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          setLat(pos.lat);
          setLng(pos.lng);
        });
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When lat/lng state changes from geocode, move the map & marker
  const flyTo = (newLat: number, newLng: number) => {
    setLat(newLat);
    setLng(newLng);
    setHasPin(true);

    const map = mapRef.current;
    if (!map) return;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require('leaflet') as typeof import('leaflet');

    const pinIcon = L.divIcon({
      className: '',
      html: `<div style="width:28px;height:28px;background:#d32f2f;border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
    });

    map.flyTo([newLat, newLng], 16);

    if (markerRef.current) {
      markerRef.current.setLatLng([newLat, newLng]);
    } else {
      const marker = L.marker([newLat, newLng], { draggable: true, icon: pinIcon }).addTo(map);
      markerRef.current = marker;
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        setLat(pos.lat);
        setLng(pos.lng);
      });
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setSearchError(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query.trim())}&limit=1`
      );
      const results = await res.json();
      if (results[0]) {
        flyTo(Number(results[0].lat), Number(results[0].lon));
      } else {
        setSearchError('No results found. Try a different address.');
      }
    } catch {
      setSearchError('Search failed. Check your connection.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 520 }}>
      {/* Search bar */}
      <Box sx={{ px: 2, pt: 2, pb: 1 }}>
        <TextField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search address or place name…"
          size="small"
          fullWidth
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  {searching ? (
                    <CircularProgress size={18} />
                  ) : (
                    <IconButton size="small" onClick={handleSearch} edge="end">
                      <Search fontSize="small" />
                    </IconButton>
                  )}
                </InputAdornment>
              ),
            },
          }}
        />
        {searchError && (
          <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
            {searchError}
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          Search for a location, then click on the map to drop the pin exactly where you want it.
        </Typography>
      </Box>

      {/* Map */}
      <Box ref={containerRef} sx={{ flex: 1 }} />

      {/* Footer */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderTop: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Box sx={{ flex: 1 }}>
          {hasPin ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <MyLocation sx={{ fontSize: 15, color: 'text.secondary' }} />
              <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                {lat.toFixed(6)}, {lng.toFixed(6)}
              </Typography>
            </Box>
          ) : (
            <Typography variant="caption" color="text.secondary">
              Click anywhere on the map to place a pin
            </Typography>
          )}
        </Box>
        <Button size="small" onClick={onCancel}>Cancel</Button>
        <Button
          size="small"
          variant="contained"
          disabled={!hasPin}
          onClick={() => onConfirm(lat, lng)}
        >
          Confirm Location
        </Button>
      </Box>
    </Box>
  );
}
