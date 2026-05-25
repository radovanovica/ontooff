'use client';

import { Suspense } from 'react';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
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
  Tooltip,
} from '@mui/material';
import { ArrowBack, LocationOn, Phone, Email, Language, Star, RateReview } from '@mui/icons-material';
import ReviewForm from '@/components/reviews/ReviewForm';
import { Rating } from '@mui/material';
import Link from 'next/link';
import InstagramStoryShare from '@/components/blog/InstagramStoryShare';
import { useTranslation } from '@/i18n/client';
import Navbar from '@/components/layout/Navbar';
import RegistrationStepper from '@/components/registration/RegistrationStepper';
import ReviewList from '@/components/reviews/ReviewList';
import TranslatableText from '@/components/ui/TranslatableText';

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
  facebookUrl: string | null;
  instagramUrl: string | null;
  twitterUrl: string | null;
  tiktokUrl: string | null;
  youtubeUrl: string | null;
  linkedinUrl: string | null;
  activityTypes: {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
    tags: { tag: { id: string; name: string; slug: string; icon: string | null; color: string | null } }[];
  }[];
}

function PlaceContent() {
  const { t } = useTranslation('common');
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
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

  // Reviews — auto-open form if editToken present in URL
  const urlEditToken = searchParams.get('editToken') ?? undefined;
  const [reviewMeta, setReviewMeta] = useState<{ averageRating: number | null; totalRatings: number } | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(!!urlEditToken);
  const [reviewRefresh, setReviewRefresh] = useState(0);

  useEffect(() => {
    fetch(`/api/places/by-slug/${params.slug}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error(d.error ?? 'Place not found');
        setPlace(d.data);
        const urlActivityTypeId = searchParams.get('activityTypeId');
        if (urlActivityTypeId) {
          const exists = d.data.activityTypes?.find((at: { id: string }) => at.id === urlActivityTypeId);
          if (exists) setSelectedActivityTypeId(urlActivityTypeId);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [params.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!place?.id) return;
    // Fetch review aggregate
    fetch(`/api/reviews?placeId=${place.id}&pageSize=1`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setReviewMeta(d.meta); })
      .catch(() => {});
  }, [place?.id]);

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
        <Button startIcon={<ArrowBack />} onClick={() => router.back()}>{t('places.goBack')}</Button>
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
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Button
              component={Link}
              href="/search"
              startIcon={<ArrowBack />}
              sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: 'white' } }}
            >
              {t('places.backToSearch')}
            </Button>
            <InstagramStoryShare
              title={place.name}
              excerpt={place.description}
              category={place.activityTypes[0]?.name}
              categoryColor={place.activityTypes[0]?.color}
              coverUrl={place.coverUrl}
              slug={place.slug}
              pageUrl={`https://ontooff.com/places/${place.slug}`}
              subtitle={[place.city, place.country].filter(Boolean).join(', ') || undefined}
            />
          </Box>

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

          {/* Rating badge */}
          {reviewMeta && reviewMeta.totalRatings > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5 }}>
              <Rating
                value={reviewMeta.averageRating ?? 0}
                precision={0.1}
                readOnly
                size="small"
                icon={<Star fontSize="inherit" sx={{ color: 'warning.light' }} />}
                emptyIcon={<Star fontSize="inherit" sx={{ color: 'rgba(255,255,255,0.3)' }} />}
              />
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                {reviewMeta.averageRating?.toFixed(1)} · {t('places.review', { count: reviewMeta.totalRatings })}
              </Typography>
            </Box>
          )}

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
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>{t('places.about')}</Typography>
              {place.description && (
                <TranslatableText
                  text={place.description}
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1, lineHeight: 1.7 }}
                />
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

              {/* Social media icons */}
              {[
                { url: place.facebookUrl, label: 'Facebook', svg: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' },
                { url: place.instagramUrl, label: 'Instagram', svg: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z' },
                { url: place.twitterUrl, label: 'X', svg: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
                { url: place.tiktokUrl, label: 'TikTok', svg: 'M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.27 8.27 0 004.84 1.55V6.82a4.85 4.85 0 01-1.07-.13z' },
                { url: place.youtubeUrl, label: 'YouTube', svg: 'M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z' },
                { url: place.linkedinUrl, label: 'LinkedIn', svg: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' },
              ].filter((s) => !!s.url).length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                    {[
                      { url: place.facebookUrl, label: 'Facebook', color: '#1877F2', svg: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' },
                      { url: place.instagramUrl, label: 'Instagram', color: '#E1306C', svg: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z' },
                      { url: place.twitterUrl, label: 'X', color: '#000000', svg: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
                      { url: place.tiktokUrl, label: 'TikTok', color: '#000000', svg: 'M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.27 8.27 0 004.84 1.55V6.82a4.85 4.85 0 01-1.07-.13z' },
                      { url: place.youtubeUrl, label: 'YouTube', color: '#FF0000', svg: 'M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z' },
                      { url: place.linkedinUrl, label: 'LinkedIn', color: '#0A66C2', svg: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' },
                    ].filter((s) => !!s.url).map((social) => (
                      <Tooltip key={social.label} title={social.label}>
                        <Box
                          component="a"
                          href={social.url!}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 34, height: 34, borderRadius: 1.5, border: '1px solid', borderColor: 'divider',
                            color: social.color, bgcolor: 'background.paper',
                            transition: 'all 0.15s',
                            '&:hover': { bgcolor: social.color, color: 'white', borderColor: social.color },
                          }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d={social.svg} />
                          </svg>
                        </Box>
                      </Tooltip>
                    ))}
                  </Stack>
                </>
              )}
            </Paper>

            {/* Activities offered — clickable to filter booking */}
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>{t('places.activities')}</Typography>
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
                        <Chip label={t('places.book')} size="small" sx={{ bgcolor: at.color ?? 'primary.main', color: 'white', fontWeight: 700, height: 20, fontSize: '0.65rem' }} />
                      )}
                    </Box>
                  );
                })}
              </Stack>
              {place.activityTypes.length > 1 && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5, lineHeight: 1.4 }}>
                  {t('places.filterBookingHint')}
                </Typography>
              )}
            </Paper>


          </Box>

          {/* Right: booking widget */}
          <Box ref={bookingRef} sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {t('places.bookASpot')}
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
                {t('places.noBookingAvailable')}
              </Alert>
            )}

            {bookingData && bookingData.locations && (bookingData.locations as unknown[]).length === 0 && (
              <Alert severity="info">
                {t('places.noLocationsFound')}
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
                  initialActivityTypeId={selectedActivityTypeId ?? undefined}
                />
              );
            })()}

            {/* Reviews */}
            <Box sx={{ mt: 6 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>{t('places.reviews')}</Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<RateReview />}
                  onClick={() => setShowReviewForm((p) => !p)}
                >
                  {showReviewForm ? t('places.hideReviewForm') : t('places.writeReview')}
                </Button>
              </Box>
              {showReviewForm && (
                <Box sx={{ mb: 3 }}>
                  <ReviewForm
                    placeId={place.id}
                    editToken={urlEditToken}
                    onSubmitted={() => { setShowReviewForm(false); setReviewRefresh((n) => n + 1); }}
                  />
                </Box>
              )}
              <ReviewList placeId={place.id} refreshTrigger={reviewRefresh} />
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
