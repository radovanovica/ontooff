'use client';

import { Suspense } from 'react';
import {
  Box,
  Button,
  Container,
  Grid,
  Typography,
  Card,
  CardContent,
  Chip,
  Stack,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Divider,
  Paper,
} from '@mui/material';
import {
  SearchOutlined,
  LocationOn,
  CalendarToday,
  BusinessCenter,
  ArrowBack,
  ViewList,
  Map as MapIcon,
} from '@mui/icons-material';
import { Rating } from '@mui/material';
import { ToggleButtonGroup, ToggleButton } from '@mui/material';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import { useTranslation } from '@/i18n/client';
import type { ActivityTag } from '@/types';

const LocationMap = dynamic(
  () => import('@/components/map/LocationMap'),
  { ssr: false, loading: () => null }
);

interface SearchPlace {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  country: string | null;
  description: string | null;
  coverUrl: string | null;
  logoUrl: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  averageRating: number | null;
  reviewCount: number;
  activityTypes: {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
    tags: { tag: ActivityTag }[];
    activityLocations: {
      id: string;
      name: string;
      maxCapacity: number | null;
      latitude?: number | null;
      longitude?: number | null;
      available?: boolean;
      capacity?: number;
    }[];
  }[];
  availableLocations?: { id: string; name: string }[];
}

function SearchContent() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tags, setTags] = useState<ActivityTag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>(() =>
    (searchParams.get('tags') ?? '').split(',').filter(Boolean)
  );
  const [dateFrom, setDateFrom] = useState(searchParams.get('from') ?? '');
  const [dateTo, setDateTo] = useState(searchParams.get('to') ?? '');
  const [results, setResults] = useState<SearchPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [resultsView, setResultsView] = useState<'list' | 'map'>('list');

  useEffect(() => {
    fetch('/api/tags')
      .then((r) => r.json())
      .then((d) => setTags(d.data ?? []))
      .catch(() => {});
  }, []);

  const doSearch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedTags.length) params.set('tags', selectedTags.join(','));
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
      const res = await fetch(`/api/search?${params}`);
      const data = await res.json();
      setResults(data.data?.items ?? []);
      setTotal(data.data?.total ?? 0);
    } catch {
      setError(t('search.error', 'Failed to load results. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, [selectedTags, dateFrom, dateTo, t]);

  // Run search on mount with URL params
  useEffect(() => {
    doSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleTag = (slug: string) => {
    setSelectedTags((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (selectedTags.length) params.set('tags', selectedTags.join(','));
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);
    router.push(`/search?${params.toString()}`, { scroll: false });
    doSearch();
  };

  return (
    <>
      <Navbar />

      {/* Search Filter Bar */}
      <Box sx={{ bgcolor: '#1a3d17', pt: 10, pb: 3 }}>
        <Container maxWidth="lg">
          <Button
            component={Link}
            href="/"
            startIcon={<ArrowBack />}
            sx={{ color: 'rgba(255,255,255,0.7)', mb: 2, '&:hover': { color: 'white' } }}
          >
            {t('search.backToHome', 'Back to home')}
          </Button>
          <Typography variant="h5" sx={{ color: 'white', fontWeight: 700, mb: 3 }}>
            {t('search.title', 'Find Activities & Locations')}
          </Typography>

          <Paper sx={{ p: 2.5, borderRadius: 2 }}>
            <Grid container spacing={2} sx={{ alignItems: 'flex-end' }}>
              {/* Tags */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, mb: 1, display: 'block' }}>
                  {t('home.search.selectActivity', 'Activity')}
                </Typography>
                <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
                  {tags.map((tag) => {
                    const active = selectedTags.includes(tag.slug);
                    return (
                      <Chip
                        key={tag.slug}
                        label={`${tag.icon ?? ''} ${tag.name}`}
                        size="small"
                        onClick={() => toggleTag(tag.slug)}
                        sx={{
                          cursor: 'pointer',
                          fontWeight: 500,
                          bgcolor: active ? (tag.color ?? '#2d5a27') : 'transparent',
                          color: active ? 'white' : 'text.primary',
                          border: `1.5px solid ${active ? (tag.color ?? '#2d5a27') : '#ddd'}`,
                          '&:hover': {
                            bgcolor: active ? (tag.color ?? '#2d5a27') : `${tag.color ?? '#2d5a27'}20`,
                          },
                        }}
                      />
                    );
                  })}
                </Stack>
              </Grid>

              {/* Dates */}
              <Grid size={{ xs: 12, sm: 4, md: 2 }}>
                <TextField
                  label={t('home.search.dateFrom', 'Check-in')}
                  type="date"
                  size="small"
                  fullWidth
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  slotProps={{
                    inputLabel: { shrink: true },
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <CalendarToday sx={{ fontSize: 15, color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4, md: 2 }}>
                <TextField
                  label={t('home.search.dateTo', 'Check-out')}
                  type="date"
                  size="small"
                  fullWidth
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  slotProps={{
                    inputLabel: { shrink: true },
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <CalendarToday sx={{ fontSize: 15, color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4, md: 2 }}>
                <Button
                  variant="contained"
                  fullWidth
                  size="medium"
                  onClick={handleSearch}
                  startIcon={<SearchOutlined />}
                  sx={{ bgcolor: '#2d5a27', '&:hover': { bgcolor: '#1e3d1a' }, py: 1.1 }}
                >
                  {t('home.search.button', 'Search')}
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Container>
      </Box>

      {/* Results */}
      <Container maxWidth="lg" sx={{ py: 6 }}>
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {loading ? (
              t('search.searching', 'Searching...')
            ) : (
              t('search.results', '{{count}} place(s) found', { count: total }).replace('{{count}}', String(total))
            )}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {selectedTags.length > 0 && (
              <Stack direction="row" spacing={1}>
                {selectedTags.map((slug) => {
                  const tag = tags.find((t) => t.slug === slug);
                  return tag ? (
                    <Chip
                      key={slug}
                      label={`${tag.icon ?? ''} ${tag.name}`}
                      size="small"
                      onDelete={() => toggleTag(slug)}
                      sx={{ bgcolor: tag.color + '20', color: tag.color }}
                    />
                  ) : null;
                })}
              </Stack>
            )}
            {results.length > 0 && (
              <ToggleButtonGroup
                value={resultsView}
                exclusive
                onChange={(_, v) => v && setResultsView(v)}
                size="small"
              >
                <ToggleButton value="list"><ViewList fontSize="small" sx={{ mr: 0.5 }} />List</ToggleButton>
                <ToggleButton value="map"><MapIcon fontSize="small" sx={{ mr: 0.5 }} />Map</ToggleButton>
              </ToggleButtonGroup>
            )}
          </Box>
        </Box>

        {loading ? (
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <CircularProgress size={48} />
          </Box>
        ) : results.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
              {t('search.noResults', 'No places found')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {t('search.noResultsHint', 'Try adjusting your filters or selecting different activities.')}
            </Typography>
            <Button variant="outlined" onClick={() => { setSelectedTags([]); setDateFrom(''); setDateTo(''); }}>
              {t('search.clearFilters', 'Clear filters')}
            </Button>
          </Box>
        ) : resultsView === 'map' ? (
          (() => {
            const pins = results.flatMap((place) =>
              place.activityTypes
                .flatMap((at) => at.activityLocations)
                .filter((loc) => loc.latitude != null && loc.longitude != null)
                .map((loc) => ({
                  id: `${place.id}__${loc.id}`,
                  name: place.name,
                  description: `${loc.name}${place.city ? ` · ${place.city}` : ''}`,
                  latitude: loc.latitude as number,
                  longitude: loc.longitude as number,
                }))
            );
            if (pins.length === 0) {
              return (
                <Alert severity="info">
                  No locations with GPS coordinates found in these results. Set coordinates in Location Settings to enable map view.
                </Alert>
              );
            }
            return (
              <Box sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                <LocationMap
                  pins={pins}
                  height={520}
                  onPinClick={(compositeId) => {
                    const placeId = compositeId.split('__')[0];
                    const place = results.find((p) => p.id === placeId);
                    if (place) window.location.href = `/places/${place.slug}`;
                  }}
                />
              </Box>
            );
          })()
        ) : (
          <Grid container spacing={3}>
            {results.map((place) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={place.id}>
                <Card
                  elevation={2}
                  sx={{
                    borderRadius: 3,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'box-shadow 0.2s, transform 0.2s',
                    '&:hover': { boxShadow: 8, transform: 'translateY(-4px)' },
                  }}
                >
                  {/* Cover image */}
                  <Box
                    sx={{
                      height: 160,
                      bgcolor: '#e8f5e9',
                      background: place.coverUrl
                        ? undefined
                        : 'linear-gradient(135deg, #2d5a27 0%, #4a7c59 100%)',
                      backgroundImage: place.coverUrl ? `url(${place.coverUrl})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {!place.coverUrl && <BusinessCenter sx={{ fontSize: 56, color: 'rgba(255,255,255,0.3)' }} />}

                    {/* Logo avatar */}
                    {place.logoUrl && (
                      <Box
                        component="img"
                        src={place.logoUrl}
                        alt={place.name}
                        sx={{
                          position: 'absolute',
                          bottom: 10,
                          left: 12,
                          width: 48,
                          height: 48,
                          borderRadius: 1.5,
                          objectFit: 'cover',
                          border: '2px solid white',
                          bgcolor: 'white',
                          boxShadow: 2,
                        }}
                      />
                    )}

                    {/* Activity type chips */}
                    <Stack direction="row" spacing={0.5} sx={{ position: 'absolute', bottom: 10, left: place.logoUrl ? 72 : 12 }}>
                      {place.activityTypes.slice(0, 3).map((at) => (
                        <Chip
                          key={at.id}
                          label={`${at.icon ?? ''} ${at.name}`}
                          size="small"
                          sx={{ bgcolor: 'rgba(0,0,0,0.5)', color: 'white', fontSize: '0.7rem', height: 22 }}
                        />
                      ))}
                    </Stack>

                    {/* Rating badge */}
                    {place.averageRating !== null && (
                      <Box sx={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        bgcolor: 'rgba(0,0,0,0.6)',
                        color: 'white',
                        borderRadius: 1.5,
                        px: 1,
                        py: 0.25,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                      }}>
                        <Rating value={place.averageRating} precision={0.1} size="small" readOnly sx={{ color: '#ffc107', fontSize: '0.9rem' }} />
                        <Typography variant="caption" sx={{ fontWeight: 700, lineHeight: 1 }}>
                          {place.averageRating.toFixed(1)}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.8, lineHeight: 1 }}>
                          ({place.reviewCount})
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                      {place.name}
                    </Typography>

                    {(place.city || place.country) && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                        <LocationOn sx={{ fontSize: 15, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                          {[place.city, place.country].filter(Boolean).join(', ')}
                        </Typography>
                      </Box>
                    )}

                    {place.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {place.description}
                      </Typography>
                    )}

                    {/* Tags from activity types */}
                    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                      {Array.from(
                        new Map(
                          place.activityTypes
                            .flatMap((at) => at.tags.map((t) => t.tag))
                            .map((tag) => [tag.slug, tag])
                        ).values()
                      ).slice(0, 5).map((tag) => (
                        <Chip
                          key={tag.slug}
                          label={`${tag.icon ?? ''} ${tag.name}`}
                          size="small"
                          sx={{
                            bgcolor: (tag.color ?? '#2d5a27') + '18',
                            color: tag.color ?? '#2d5a27',
                            fontSize: '0.68rem',
                            height: 20,
                          }}
                        />
                      ))}
                    </Stack>

                    <Divider sx={{ mb: 2 }} />

                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="contained"
                        size="small"
                        fullWidth
                        component={Link}
                        href={`/places/${place.slug}`}
                        sx={{ bgcolor: '#2d5a27', '&:hover': { bgcolor: '#1e3d1a' } }}
                      >
                        {t('search.bookNow', 'Book Now')}
                      </Button>
                      {place.website && (
                        <Button
                          variant="outlined"
                          size="small"
                          component="a"
                          href={place.website}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {t('search.website', 'Website')}
                        </Button>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress size={48} />
        </Box>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
