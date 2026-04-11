'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Chip,
  Stack,
  Paper,
  Divider,
  ImageList,
  ImageListItem,
} from '@mui/material';
import { ArrowBack, LocationOn, Phone, Email, Language, Info } from '@mui/icons-material';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import RegistrationStepper from '@/components/registration/RegistrationStepper';
import ReviewList from '@/components/reviews/ReviewList';
import { SpotStatus } from '@prisma/client';

interface PlaceDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  city: string | null;
  country: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  embedToken: string | null;
  activityTypes: {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
    tags: { tag: { id: string; name: string; slug: string; icon: string | null; color: string | null } }[];
    activityLocations: {
      id: string;
      name: string;
      description: string | null;
      gallery: string | null;       // JSON: string[]
      instructions: string | null;
    }[];
  }[];
}

function PlaceContent() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const [place, setPlace] = useState<PlaceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // For the booking widget
  const [embedData, setEmbedData] = useState<{
    location: unknown;
    locations: unknown[];
  } | null>(null);
  const [embedLoading, setEmbedLoading] = useState(false);
  const [embedError, setEmbedError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/places/by-slug/${params.slug}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error(d.error ?? 'Place not found');
        setPlace(d.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [params.slug]);

  useEffect(() => {
    if (!place?.embedToken) return;
    setEmbedLoading(true);
    fetch(`/api/embed/${place.embedToken}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error(d.error ?? 'Booking not available');
        setEmbedData(d.data);
      })
      .catch((e) => setEmbedError(e.message))
      .finally(() => setEmbedLoading(false));
  }, [place?.embedToken]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  if (error || !place) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Alert severity="error" sx={{ mb: 3 }}>{error ?? 'Place not found'}</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => router.back()}>Go Back</Button>
      </Container>
    );
  }

  return (
    <>
      <Navbar />

      {/* Hero */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #2d5a27 0%, #4a7c59 100%)',
          pt: 10,
          pb: 6,
          color: 'white',
        }}
      >
        <Container maxWidth="lg">
          <Button
            component={Link}
            href="/search"
            startIcon={<ArrowBack />}
            sx={{ color: 'rgba(255,255,255,0.7)', mb: 2, '&:hover': { color: 'white' } }}
          >
            Back to Search
          </Button>
          <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>
            {place.name}
          </Typography>
          {(place.city || place.country) && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 2 }}>
              <LocationOn sx={{ fontSize: 18 }} />
              <Typography variant="h6" sx={{ fontWeight: 400 }}>
                {[place.city, place.country].filter(Boolean).join(', ')}
              </Typography>
            </Box>
          )}

          {/* Activity tags */}
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
            {Array.from(
              new Map(
                place.activityTypes
                  .flatMap((at) => at.tags.map((t) => t.tag))
                  .map((tag) => [tag.slug, tag])
              ).values()
            ).map((tag) => (
              <Chip
                key={tag.slug}
                label={`${tag.icon ?? ''} ${tag.name}`}
                size="small"
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 600 }}
              />
            ))}
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Box sx={{ display: 'flex', gap: 4, flexDirection: { xs: 'column', md: 'row' } }}>
          {/* Left: info */}
          <Box sx={{ flex: '0 0 300px' }}>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>About</Typography>
              {place.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.7 }}>
                  {place.description}
                </Typography>
              )}
              <Divider sx={{ my: 2 }} />
              {place.phone && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Phone sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2">{place.phone}</Typography>
                </Box>
              )}
              {place.email && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Email sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2">{place.email}</Typography>
                </Box>
              )}
              {place.website && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Language sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography
                    variant="body2"
                    component="a"
                    href={place.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ color: '#2d5a27', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                  >
                    {place.website.replace(/^https?:\/\//, '')}
                  </Typography>
                </Box>
              )}
            </Paper>

            {/* Activities offered */}
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Activities</Typography>
              <Stack spacing={1}>
                {place.activityTypes.map((at) => (
                  <Box key={at.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {at.icon && <Typography sx={{ fontSize: '1.2rem' }}>{at.icon}</Typography>}
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{at.name}</Typography>
                  </Box>
                ))}
              </Stack>
            </Paper>

            {/* Location instructions */}
            {place.activityTypes.flatMap((at) => at.activityLocations).some((loc) => loc.instructions) && (
              <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mt: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Info sx={{ color: 'info.main', fontSize: 20 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>How to Find Us</Typography>
                </Box>
                <Stack spacing={2}>
                  {place.activityTypes.flatMap((at) => at.activityLocations).filter((loc) => loc.instructions).map((loc) => (
                    <Box key={loc.id}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>{loc.name}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line', lineHeight: 1.7 }}>
                        {loc.instructions}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Paper>
            )}
          </Box>

          {/* Right: booking widget */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* Gallery */}
            {(() => {
              const allImages = place.activityTypes
                .flatMap((at) => at.activityLocations)
                .flatMap((loc) => {
                  if (!loc.gallery) return [];
                  try { return JSON.parse(loc.gallery) as string[]; } catch { return []; }
                });
              if (allImages.length === 0) return null;
              return (
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Photos</Typography>
                  <ImageList
                    sx={{ width: '100%', height: allImages.length > 3 ? 380 : 220, borderRadius: 2, overflow: 'hidden' }}
                    variant="quilted"
                    cols={allImages.length === 1 ? 1 : Math.min(allImages.length, 3)}
                    rowHeight={allImages.length > 3 ? 180 : 210}
                  >
                    {allImages.map((src, idx) => (
                      <ImageListItem key={idx} cols={idx === 0 && allImages.length > 2 ? 2 : 1} rows={idx === 0 && allImages.length > 2 ? 2 : 1}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={src}
                          alt={`Location photo ${idx + 1}`}
                          loading="lazy"
                          style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                        />
                      </ImageListItem>
                    ))}
                  </ImageList>
                </Box>
              );
            })()}

            <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
              Book a Spot
            </Typography>

            {embedLoading && (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            )}

            {embedError && (
              <Alert severity="info">
                Online booking is not available for this place yet. Please contact them directly.
              </Alert>
            )}

            {!place.embedToken && !embedLoading && (
              <Alert severity="info">
                Online booking is not available for this place yet. Please contact them directly.
              </Alert>
            )}

            {embedData && (
              <RegistrationStepper
                location={embedData.location as Parameters<typeof RegistrationStepper>[0]['location']}
                locations={embedData.locations as Parameters<typeof RegistrationStepper>[0]['locations']}
              />
            )}

            {/* Reviews */}
            <Box sx={{ mt: 5 }}>
              <ReviewList placeId={place.id} />
            </Box>
          </Box>
        </Box>
      </Container>
    </>
  );
}

export default function PlacePage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress size={48} />
        </Box>
      }
    >
      <PlaceContent />
    </Suspense>
  );
}
