'use client';

import { Suspense } from 'react';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Chip,
  Paper,
  Divider,
  Avatar,
  Stack,
} from '@mui/material';
import { ArrowBack, LocationOn, Phone, Email, Language } from '@mui/icons-material';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import RegistrationStepper from '@/components/registration/RegistrationStepper';
import ReviewList from '@/components/reviews/ReviewList';

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
  logoUrl: string | null;
  coverUrl: string | null;
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
      latitude: number | null;
      longitude: number | null;
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
  const [bookingData, setBookingData] = useState<{
    locations: unknown[];
  } | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Activity filter — drives the stepper pre-selection
  const [selectedActivityTypeId, setSelectedActivityTypeId] = useState<string | null>(null);
  const bookingRef = useRef<HTMLDivElement>(null);

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
    if (!place?.id) return;
    setBookingLoading(true);
    fetch(`/api/places/${place.id}/booking-data`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error(d.error ?? 'Booking not available');
        setBookingData(d.data);
      })
      .catch((e) => setBookingError(e.message))
      .finally(() => setBookingLoading(false));
  }, [place?.id]);

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
          background: place.coverUrl
            ? undefined
            : 'linear-gradient(135deg, #2d5a27 0%, #4a7c59 100%)',
          backgroundImage: place.coverUrl
            ? `linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.6) 100%), url(${place.coverUrl})`
            : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
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

          {/* Logo + name row */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            {place.logoUrl && (
              <Avatar
                src={place.logoUrl}
                alt={place.name}
                sx={{ width: 72, height: 72, borderRadius: 2, border: '3px solid rgba(255,255,255,0.7)', bgcolor: 'white' }}
              />
            )}
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 800, mb: 0.5 }}>
                {place.name}
              </Typography>
              {(place.city || place.country) && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <LocationOn sx={{ fontSize: 18 }} />
                  <Typography variant="h6" sx={{ fontWeight: 400 }}>
                    {[place.city, place.country].filter(Boolean).join(', ')}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>

          {/* Activity tags */}
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75, mt: 2 }}>
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

            {/* Activities offered — clickable to filter booking */}
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Activities</Typography>
              <Stack spacing={1}>
                {place.activityTypes.map((at) => {
                  const isSelected = selectedActivityTypeId === at.id;
                  return (
                    <Box
                      key={at.id}
                      onClick={() => {
                        const next = isSelected ? null : at.id;
                        setSelectedActivityTypeId(next);
                        setTimeout(() => bookingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                      }}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 1,
                        px: 1.5, py: 1, borderRadius: 2, cursor: 'pointer',
                        border: '1.5px solid',
                        borderColor: isSelected ? (at.color ?? 'primary.main') : 'transparent',
                        bgcolor: isSelected ? ((at.color ?? '#2d5a27') + '18') : 'transparent',
                        transition: 'all 0.15s',
                        '&:hover': { bgcolor: (at.color ?? '#2d5a27') + '12', borderColor: at.color ?? 'primary.light' },
                      }}
                    >
                      {at.icon && <Typography sx={{ fontSize: '1.2rem', lineHeight: 1 }}>{at.icon}</Typography>}
                      <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }}>{at.name}</Typography>
                      {isSelected && (
                        <Chip label="Book" size="small" sx={{ bgcolor: at.color ?? 'primary.main', color: 'white', fontWeight: 700, height: 20, fontSize: '0.65rem' }} />
                      )}
                    </Box>
                  );
                })}
              </Stack>
              {place.activityTypes.length > 1 && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5, lineHeight: 1.4 }}>
                  Click an activity to filter the booking widget
                </Typography>
              )}
            </Paper>


          </Box>

          {/* Right: booking widget */}
          <Box ref={bookingRef} sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                Book a Spot
              </Typography>
              {selectedActivityTypeId && (() => {
                const at = place.activityTypes.find((a) => a.id === selectedActivityTypeId);
                return at ? (
                  <Chip
                    label={`${at.icon ?? ''} ${at.name}`.trim()}
                    onDelete={() => setSelectedActivityTypeId(null)}
                    size="small"
                    sx={{ bgcolor: at.color ?? 'primary.main', color: 'white', fontWeight: 700 }}
                  />
                ) : null;
              })()}
            </Box>

            {bookingLoading && (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            )}

            {bookingError && (
              <Alert severity="info">
                Online booking is not available for this place yet. Please contact them directly.
              </Alert>
            )}

            {bookingData && bookingData.locations && (bookingData.locations as unknown[]).length === 0 && (
              <Alert severity="info">
                No active locations found. Please add a location and spots in the owner dashboard.
              </Alert>
            )}

            {bookingData && (bookingData.locations as unknown[]).length > 0 && (() => {
              type Loc = Parameters<typeof RegistrationStepper>[0]['location'];
              type Locs = Parameters<typeof RegistrationStepper>[0]['locations'];
              const locs = bookingData.locations as NonNullable<Locs>;
              return (
                <RegistrationStepper
                  location={locs[0] as Loc}
                  locations={locs}
                  initialActivityTypeId={selectedActivityTypeId}
                />
              );
            })()}

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
