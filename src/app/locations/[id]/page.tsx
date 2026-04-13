'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Chip,
  Stack,
  Divider,
  ImageList,
  ImageListItem,
  Paper,
} from '@mui/material';
import {
  ArrowBack,
  LocationOn,
  Phone,
  Email,
  Language,
  Info,
  Public,
} from '@mui/icons-material';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Navbar from '@/components/layout/Navbar';
import type { ActivityTag } from '@/types';

const LocationMap = dynamic(
  () => import('@/components/map/LocationMap'),
  { ssr: false, loading: () => null }
);

interface FreeLocationDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  gallery: string | null;
  coverImageIndex: number | null;
  instructions: string | null;
  isActive: boolean;
  tags: { tag: ActivityTag }[];
}

function LocationContent() {
  const params = useParams<{ id: string }>();
  const slug = params.id;

  const [location, setLocation] = useState<FreeLocationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/free-locations/${slug}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error('Location not found');
        setLocation(d.data);
      })
      .catch(() => setError('Location not found'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !location) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Alert severity="error">{error ?? 'Location not found'}</Alert>
        <Button component={Link} href="/search" startIcon={<ArrowBack />} sx={{ mt: 2 }}>
          Back to Search
        </Button>
      </Container>
    );
  }

  const galleryImages: string[] = (() => {
    try { return JSON.parse(location.gallery ?? '[]'); } catch { return []; }
  })();

  const coverImage =
    location.coverUrl ??
    (location.coverImageIndex != null ? galleryImages[location.coverImageIndex] : null) ??
    galleryImages[0] ??
    null;

  return (
    <>
      <Navbar />

      {/* Hero cover */}
      <Box
        sx={{
          height: { xs: 220, md: 340 },
          background: coverImage
            ? `url(${coverImage}) center/cover no-repeat`
            : 'linear-gradient(135deg, #7b3f00 0%, #c67c2e 100%)',
          position: 'relative',
          display: 'flex',
          alignItems: 'flex-end',
        }}
      >
        {/* Overlay */}
        <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.35)' }} />

        <Container maxWidth="lg" sx={{ position: 'relative', pb: 3 }}>
          <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
            <Chip
              icon={<Public sx={{ fontSize: '0.85rem !important' }} />}
              label="Community Location"
              size="small"
              sx={{ bgcolor: '#7b3f00', color: 'white', fontWeight: 700 }}
            />
            {location.tags.slice(0, 4).map(({ tag }) => (
              <Chip
                key={tag.slug}
                label={`${tag.icon ?? ''} ${tag.name}`}
                size="small"
                sx={{ bgcolor: (tag.color ?? '#555') + 'cc', color: 'white', fontWeight: 600 }}
              />
            ))}
          </Stack>

          <Typography variant="h3" sx={{ color: 'white', fontWeight: 800, textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
            {location.name}
          </Typography>

          {(location.city || location.country) && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
              <LocationOn sx={{ color: 'rgba(255,255,255,0.85)', fontSize: 18 }} />
              <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                {[location.city, location.country].filter(Boolean).join(', ')}
              </Typography>
            </Box>
          )}
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 5 }}>
        <Button
          component={Link}
          href="/search"
          startIcon={<ArrowBack />}
          variant="outlined"
          size="small"
          sx={{ mb: 3 }}
        >
          Back to Search
        </Button>

        <Box sx={{ display: 'flex', gap: 4, flexDirection: { xs: 'column', md: 'row' } }}>
          {/* Left column: info */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* Description */}
            {location.description && (
              <Paper elevation={1} sx={{ p: 3, borderRadius: 3, mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>About</Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-line', color: 'text.secondary' }}>
                  {location.description}
                </Typography>
              </Paper>
            )}

            {/* Instructions */}
            {location.instructions && (
              <Paper elevation={1} sx={{ p: 3, borderRadius: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <Info color="info" />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>How to Find It</Typography>
                </Box>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-line', color: 'text.secondary' }}>
                  {location.instructions}
                </Typography>
              </Paper>
            )}

            {/* Gallery */}
            {galleryImages.length > 0 && (
              <Paper elevation={1} sx={{ p: 3, borderRadius: 3, mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Photos</Typography>
                <ImageList
                  sx={{ width: '100%', borderRadius: 2, overflow: 'hidden' }}
                  cols={Math.min(galleryImages.length, 3)}
                  rowHeight={180}
                >
                  {galleryImages.map((src, i) => (
                    <ImageListItem key={i}>
                      <img
                        src={src}
                        alt={`${location.name} photo ${i + 1}`}
                        loading="lazy"
                        style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                      />
                    </ImageListItem>
                  ))}
                </ImageList>
              </Paper>
            )}

            {/* Map */}
            {location.latitude != null && location.longitude != null && (
              <Paper elevation={1} sx={{ p: 3, borderRadius: 3, mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Location on Map</Typography>
                <Box sx={{ borderRadius: 2, overflow: 'hidden' }}>
                  <LocationMap
                    pins={[{
                      id: location.id,
                      name: location.name,
                      description: location.address ?? location.city ?? undefined,
                      latitude: location.latitude,
                      longitude: location.longitude,
                      color: '#7b3f00',
                    }]}
                    height={340}
                    zoom={15}
                  />
                </Box>
              </Paper>
            )}
          </Box>

          {/* Right column: contact info */}
          <Box sx={{ width: { xs: '100%', md: 300 }, flexShrink: 0 }}>
            <Paper elevation={2} sx={{ p: 3, borderRadius: 3, mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Contact & Info</Typography>
              <Divider sx={{ mb: 2 }} />

              {location.address && (
                <Box sx={{ display: 'flex', gap: 1.5, mb: 2, alignItems: 'flex-start' }}>
                  <LocationOn sx={{ color: 'text.secondary', mt: 0.3, fontSize: 20 }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.25 }}>Address</Typography>
                    <Typography variant="body2">
                      {[location.address, location.city, location.country].filter(Boolean).join(', ')}
                    </Typography>
                  </Box>
                </Box>
              )}

              {location.phone && (
                <Box sx={{ display: 'flex', gap: 1.5, mb: 2, alignItems: 'center' }}>
                  <Phone sx={{ color: 'text.secondary', fontSize: 20 }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.25 }}>Phone</Typography>
                    <Typography variant="body2" component="a" href={`tel:${location.phone}`} sx={{ color: 'inherit', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                      {location.phone}
                    </Typography>
                  </Box>
                </Box>
              )}

              {location.email && (
                <Box sx={{ display: 'flex', gap: 1.5, mb: 2, alignItems: 'center' }}>
                  <Email sx={{ color: 'text.secondary', fontSize: 20 }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.25 }}>Email</Typography>
                    <Typography variant="body2" component="a" href={`mailto:${location.email}`} sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                      {location.email}
                    </Typography>
                  </Box>
                </Box>
              )}

              {location.website && (
                <Box sx={{ display: 'flex', gap: 1.5, mb: 2, alignItems: 'center' }}>
                  <Language sx={{ color: 'text.secondary', fontSize: 20 }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.25 }}>Website</Typography>
                    <Typography variant="body2" component="a" href={location.website} target="_blank" rel="noopener noreferrer" sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                      {location.website.replace(/^https?:\/\//, '')}
                    </Typography>
                  </Box>
                </Box>
              )}

              {/* Tags */}
              {location.tags.length > 0 && (
                <>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1 }}>
                    Categories
                  </Typography>
                  <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
                    {location.tags.map(({ tag }) => (
                      <Chip
                        key={tag.slug}
                        label={`${tag.icon ?? ''} ${tag.name}`}
                        size="small"
                        sx={{
                          bgcolor: (tag.color ?? '#7b3f00') + '18',
                          color: tag.color ?? '#7b3f00',
                          fontWeight: 600,
                        }}
                      />
                    ))}
                  </Stack>
                </>
              )}

              <Divider sx={{ mt: 2, mb: 2 }} />
              <Alert severity="info" icon={<Public />} sx={{ mt: 1 }}>
                <Typography variant="caption">
                  This is a <strong>free community location</strong> — no booking required.
                </Typography>
              </Alert>
            </Paper>
          </Box>
        </Box>
      </Container>
    </>
  );
}

export default function FreeLocationPage() {
  return (
    <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}><CircularProgress /></Box>}>
      <LocationContent />
    </Suspense>
  );
}
