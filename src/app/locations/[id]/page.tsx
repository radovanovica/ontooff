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
  Paper,
  Dialog,
  DialogContent,
  IconButton,
  Fade,
} from '@mui/material';
import {
  ArrowBack,
  LocationOn,
  Phone,
  Email,
  Language,
  Info,
  Public,
  Close,
  ChevronLeft,
  ChevronRight,
  PhotoLibrary,
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

  // Gallery lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);

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
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>Photos</Typography>
                  {galleryImages.length > 3 && (
                    <Button
                      size="small"
                      startIcon={<PhotoLibrary />}
                      onClick={() => { setLightboxIdx(0); setLightboxOpen(true); }}
                      sx={{ color: '#7b3f00' }}
                    >
                      View all {galleryImages.length} photos
                    </Button>
                  )}
                </Box>

                {/* Preview: first 2 or 3 images in a grid */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: galleryImages.length === 1 ? '1fr' : galleryImages.length === 2 ? '1fr 1fr' : '2fr 1fr',
                    gridTemplateRows: galleryImages.length >= 3 ? '200px 200px' : '220px',
                    gap: 1,
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}
                >
                  {/* First image — always shown, spans 2 rows if 3+ images */}
                  <Box
                    onClick={() => { setLightboxIdx(0); setLightboxOpen(true); }}
                    sx={{
                      gridRow: galleryImages.length >= 3 ? 'span 2' : 'auto',
                      position: 'relative',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      '&:hover img': { transform: 'scale(1.04)' },
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={galleryImages[0]}
                      alt={`${location.name} photo 1`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s' }}
                    />
                  </Box>

                  {/* Second image */}
                  {galleryImages.length >= 2 && (
                    <Box
                      onClick={() => { setLightboxIdx(1); setLightboxOpen(true); }}
                      sx={{
                        position: 'relative',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        '&:hover img': { transform: 'scale(1.04)' },
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={galleryImages[1]}
                        alt={`${location.name} photo 2`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s' }}
                      />
                    </Box>
                  )}

                  {/* Third image — may show "+N more" overlay */}
                  {galleryImages.length >= 3 && (
                    <Box
                      onClick={() => { setLightboxIdx(2); setLightboxOpen(true); }}
                      sx={{
                        position: 'relative',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        '&:hover img': { transform: 'scale(1.04)' },
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={galleryImages[2]}
                        alt={`${location.name} photo 3`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s' }}
                      />
                      {/* "+N more" overlay when there are more than 3 */}
                      {galleryImages.length > 3 && (
                        <Box
                          sx={{
                            position: 'absolute', inset: 0,
                            bgcolor: 'rgba(0,0,0,0.52)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <Typography variant="h5" sx={{ color: 'white', fontWeight: 800 }}>
                            +{galleryImages.length - 3}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  )}
                </Box>
              </Paper>
            )}

            {/* Lightbox dialog */}
            <Dialog
              open={lightboxOpen}
              onClose={() => setLightboxOpen(false)}
              maxWidth={false}
              slotProps={{ paper: { sx: { bgcolor: 'rgba(0,0,0,0.95)', borderRadius: 0, m: 0, maxWidth: '100vw', width: '100vw', height: '100vh', maxHeight: '100vh' } } }}
            >
              <DialogContent sx={{ p: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', position: 'relative' }}>
                {/* Close */}
                <IconButton
                  onClick={() => setLightboxOpen(false)}
                  sx={{ position: 'absolute', top: 16, right: 16, color: 'white', bgcolor: 'rgba(255,255,255,0.12)', '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' }, zIndex: 10 }}
                >
                  <Close />
                </IconButton>

                {/* Counter */}
                <Typography
                  variant="caption"
                  sx={{ position: 'absolute', top: 22, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.7)', zIndex: 10 }}
                >
                  {lightboxIdx + 1} / {galleryImages.length}
                </Typography>

                {/* Prev */}
                {galleryImages.length > 1 && (
                  <IconButton
                    onClick={() => setLightboxIdx((i) => (i - 1 + galleryImages.length) % galleryImages.length)}
                    sx={{ position: 'absolute', left: 16, color: 'white', bgcolor: 'rgba(255,255,255,0.12)', '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' }, zIndex: 10 }}
                  >
                    <ChevronLeft sx={{ fontSize: 36 }} />
                  </IconButton>
                )}

                {/* Image */}
                <Fade in key={lightboxIdx}>
                  <Box sx={{ maxWidth: '90vw', maxHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={galleryImages[lightboxIdx]}
                      alt={`${location.name} photo ${lightboxIdx + 1}`}
                      style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 8 }}
                    />
                  </Box>
                </Fade>

                {/* Next */}
                {galleryImages.length > 1 && (
                  <IconButton
                    onClick={() => setLightboxIdx((i) => (i + 1) % galleryImages.length)}
                    sx={{ position: 'absolute', right: 16, color: 'white', bgcolor: 'rgba(255,255,255,0.12)', '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' }, zIndex: 10 }}
                  >
                    <ChevronRight sx={{ fontSize: 36 }} />
                  </IconButton>
                )}

                {/* Thumbnail strip */}
                {galleryImages.length > 1 && (
                  <Stack
                    direction="row"
                    spacing={0.75}
                    sx={{
                      position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
                      maxWidth: '80vw', overflowX: 'auto', pb: 0.5,
                      '&::-webkit-scrollbar': { height: 4 },
                      '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.3)', borderRadius: 2 },
                    }}
                  >
                    {galleryImages.map((src, i) => (
                      <Box
                        key={i}
                        onClick={() => setLightboxIdx(i)}
                        sx={{
                          width: 54, height: 40, flexShrink: 0,
                          borderRadius: 1,
                          overflow: 'hidden',
                          cursor: 'pointer',
                          border: i === lightboxIdx ? '2px solid white' : '2px solid transparent',
                          opacity: i === lightboxIdx ? 1 : 0.55,
                          transition: 'all 0.15s',
                          '&:hover': { opacity: 0.9 },
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      </Box>
                    ))}
                  </Stack>
                )}
              </DialogContent>
            </Dialog>

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
