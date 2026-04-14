'use client';

import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import NextLink from 'next/link';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Chip,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Skeleton,
  Alert,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  Tooltip,
  Container,
  CircularProgress,
} from '@mui/material';
import {
  Search,
  Clear,
  ViewList,
  Map as MapIcon,
  Star,
  LocationOn,
  Public,
  FilterAlt,
  MyLocation,
} from '@mui/icons-material';
import { ActivityTag } from '@/types';
import DateRangePicker from '@/components/ui/DateRangePicker';
import Navbar from '@/components/layout/Navbar';
import { useTranslation } from '@/i18n/client';

// Dynamically import the interactive map (no SSR)
const SearchMap = dynamic(() => import('@/components/map/SearchMap'), {
  ssr: false,
  loading: () => (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        bgcolor: 'grey.100',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 2,
      }}
    >
      <Typography color="text.secondary">Loading map…</Typography>
    </Box>
  ),
});

// ── Types ──────────────────────────────────────────────────────────────────

interface AvailableLocation {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
}

interface SearchPlace {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  country: string | null;
  description: string | null;
  coverUrl: string | null;
  logoUrl: string | null;
  averageRating: number | null;
  reviewCount: number;
  isFree?: boolean;
  tags?: { tag: ActivityTag }[];
  activityTypes: {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
    tags: { tag: ActivityTag }[];
  }[];
  availableLocations: AvailableLocation[];
}

interface BBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface MapPin {
  id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  color: string;
  highlighted?: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function buildQuery(
  tags: string[],
  location: string,
  from: string,
  to: string,
  bbox: BBox | null,
  page: number
): string {
  const p = new URLSearchParams();
  if (tags.length) p.set('tags', tags.join(','));
  if (location) p.set('location', location);
  if (from) p.set('from', from);
  if (to) p.set('to', to);
  if (bbox) {
    p.set('minLat', String(bbox.minLat));
    p.set('maxLat', String(bbox.maxLat));
    p.set('minLng', String(bbox.minLng));
    p.set('maxLng', String(bbox.maxLng));
  }
  if (page > 1) p.set('page', String(page));
  return p.toString();
}

// ── Suspense wrapper (required for useSearchParams in Next.js App Router) ─

export default function SearchPageWrapper() {
  return (
    <Suspense fallback={
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="text.secondary">Loading…</Typography>
      </Box>
    }>
      <SearchPage />
    </Suspense>
  );
}

function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation('common');

  // Read URL params on mount only
  const initialTags = useMemo(
    () => (searchParams.get('tags') ?? '').split(',').filter(Boolean),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const initialLocation = searchParams.get('location') ?? '';
  const initialFrom = searchParams.get('from') ?? '';
  const initialTo = searchParams.get('to') ?? '';

  // ── Filter state
  const [locationInput, setLocationInput] = useState(initialLocation);
  const [locationQuery, setLocationQuery] = useState(initialLocation);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialTags);

  // ── View: list is primary
  const [view, setView] = useState<'list' | 'map'>('list');

  // ── Results
  const [places, setPlaces] = useState<SearchPlace[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  // ── Tags
  const [allTags, setAllTags] = useState<ActivityTag[]>([]);

  // ── Map bbox (only active in map view)
  const [mapBbox, setMapBbox] = useState<BBox | null>(null);

  // ── Hover sync
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Prevent bbox search from re-firing when we programmatically move the map
  const suppressNextBboxSearch = useRef(false);
  const bboxDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track in-flight fetch to avoid stale results
  const fetchIdRef = useRef(0);

  // ── Load tags once
  useEffect(() => {
    fetch('/api/tags')
      .then((r) => r.json())
      .then((d) => setAllTags(d.data ?? []));
  }, []);

  // ── Core fetch
  const fetchResults = useCallback(
    async (opts: {
      tags: string[];
      location: string;
      from: string;
      to: string;
      bbox: BBox | null;
      page?: number;
      append?: boolean;
      updateUrl?: boolean;
    }) => {
      const page = opts.page ?? 1;
      const id = ++fetchIdRef.current;
      if (opts.append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError('');
      try {
        const qs = buildQuery(opts.tags, opts.location, opts.from, opts.to, opts.bbox, page);
        const res = await fetch(`/api/search?${qs}`);
        const data = await res.json();
        if (id !== fetchIdRef.current) return; // stale
        if (!data.success) throw new Error(data.error ?? 'Search failed');
        const newItems: SearchPlace[] = data.data.items ?? [];
        if (opts.append) {
          setPlaces((prev) => [...prev, ...newItems]);
        } else {
          setPlaces(newItems);
        }
        setTotal(data.data.total ?? 0);
        setCurrentPage(data.data.page ?? 1);
        setTotalPages(data.data.totalPages ?? 1);

        if (opts.updateUrl) {
          const urlQs = buildQuery(opts.tags, opts.location, opts.from, opts.to, null, 1);
          router.replace(`/search?${urlQs}`, { scroll: false });
        }
      } catch (e: unknown) {
        if (id !== fetchIdRef.current) return;
        setError(e instanceof Error ? e.message : 'Search failed');
      } finally {
        if (id === fetchIdRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [router]
  );

  // ── Initial fetch on mount
  useEffect(() => {
    fetchResults({
      tags: initialTags,
      location: initialLocation,
      from: initialFrom,
      to: initialTo,
      bbox: null,
      page: 1,
      append: false,
      updateUrl: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Text filter search (clears bbox, resets to page 1)
  const handleFilterSearch = useCallback(() => {
    setMapBbox(null);
    setCurrentPage(1);
    setTotalPages(1);
    suppressNextBboxSearch.current = true;
    fetchResults({
      tags: selectedTags,
      location: locationQuery,
      from,
      to,
      bbox: null,
      page: 1,
      append: false,
      updateUrl: true,
    });
  }, [fetchResults, selectedTags, locationQuery, from, to]);

  // ── Map viewport change → search within bbox (no URL update, debounced)
  const handleBboxChange = useCallback(
    (bbox: BBox) => {
      if (suppressNextBboxSearch.current) {
        suppressNextBboxSearch.current = false;
        return;
      }
      if (bboxDebounceRef.current) clearTimeout(bboxDebounceRef.current);
      bboxDebounceRef.current = setTimeout(() => {
        setMapBbox(bbox);
        setCurrentPage(1);
        setTotalPages(1);
        fetchResults({
          tags: selectedTags,
          location: locationQuery,
          from,
          to,
          bbox,
          page: 1,
          append: false,
          updateUrl: false,
        });
      }, 600);
    },
    [fetchResults, selectedTags, locationQuery, from, to]
  );

  // ── Clear all
  const handleClear = useCallback(() => {
    setLocationInput('');
    setLocationQuery('');
    setFrom('');
    setTo('');
    setSelectedTags([]);
    setMapBbox(null);
    setCurrentPage(1);
    setTotalPages(1);
    suppressNextBboxSearch.current = true;
    fetchResults({ tags: [], location: '', from: '', to: '', bbox: null, page: 1, append: false, updateUrl: true });
  }, [fetchResults]);

  const toggleTag = useCallback((slug: string) => {
    setSelectedTags((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }, []);

  // ── Load more
  const handleLoadMore = useCallback(() => {
    const nextPage = currentPage + 1;
    fetchResults({
      tags: selectedTags,
      location: locationQuery,
      from,
      to,
      bbox: mapBbox,
      page: nextPage,
      append: true,
      updateUrl: false,
    });
  }, [fetchResults, currentPage, selectedTags, locationQuery, from, to, mapBbox]);

  // ── Map pins
  const mapPins = useMemo<MapPin[]>(() =>
    places.flatMap((place) =>
      place.availableLocations
        .filter((l) => l.latitude != null && l.longitude != null)
        .map((l) => ({
          id: place.isFree ? `free__${place.id}` : place.id,
          name: place.name,
          description: [place.city, place.country].filter(Boolean).join(', '),
          latitude: l.latitude!,
          longitude: l.longitude!,
          color: place.isFree ? '#7b3f00' : '#1976d2',
          highlighted: highlightedId === place.id,
        }))
    ),
    [places, highlightedId]
  );

  const hasFilters = selectedTags.length > 0 || locationQuery || from || to;
  const today = new Date().toISOString().split('T')[0];

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* ── Navbar ── */}
      <Navbar />

      {/* ── Sticky filter bar ── */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          py: 2,
          position: 'sticky',
          top: { xs: '56px', sm: '64px' },
          zIndex: 99,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
        <Container maxWidth="xl">
          <Stack spacing={1.5}>
            {/* Row 1: inputs */}
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Location search */}
              <Box sx={{ flex: '1 1 220px', minWidth: 180, maxWidth: 340 }}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder={t('search.locationPlaceholder')}
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const loc = locationInput;
                      setLocationQuery(loc);
                      setMapBbox(null);
                      setCurrentPage(1);
                      setTotalPages(1);
                      suppressNextBboxSearch.current = true;
                      fetchResults({
                        tags: selectedTags,
                        location: loc,
                        from,
                        to,
                        bbox: null,
                        page: 1,
                        append: false,
                        updateUrl: true,
                      });
                    }
                  }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <LocationOn fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                      endAdornment: locationInput ? (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setLocationInput('');
                              setLocationQuery('');
                            }}
                          >
                            <Clear fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ) : null,
                    },
                  }}
                />
              </Box>

              {/* Date range picker */}
              <DateRangePicker
                inline
                fromValue={from}
                toValue={to}
                onFromChange={(v) => {
                  setFrom(v);
                  if (to && v && v >= to) setTo('');
                }}
                onToChange={setTo}
                minFrom={today}
              />

              {/* Search button */}
              <Button
                variant="contained"
                startIcon={<Search />}
                onClick={() => {
                  const loc = locationInput;
                  setLocationQuery(loc);
                  setMapBbox(null);
                  setCurrentPage(1);
                  setTotalPages(1);
                  suppressNextBboxSearch.current = true;
                  fetchResults({
                    tags: selectedTags,
                    location: loc,
                    from,
                    to,
                    bbox: null,
                    page: 1,
                    append: false,
                    updateUrl: true,
                  });
                }}
                disabled={loading}
                sx={{ flexShrink: 0 }}
              >
                {t('search.search')}
              </Button>

              {/* Clear */}
              {hasFilters && (
                <Tooltip title={t('search.clearAll')}>
                  <IconButton onClick={handleClear}>
                    <Clear />
                  </IconButton>
                </Tooltip>
              )}

              {/* View toggle — pushed right */}
              <Box sx={{ ml: 'auto' }}>
                <ToggleButtonGroup
                  size="small"
                  value={view}
                  exclusive
                  onChange={(_, v) => {
                    if (!v) return;
                    setView(v);
                    if (v === 'list' && mapBbox) {
                      setMapBbox(null);
                      setCurrentPage(1);
                      setTotalPages(1);
                      suppressNextBboxSearch.current = true;
                      fetchResults({
                        tags: selectedTags,
                        location: locationQuery,
                        from,
                        to,
                        bbox: null,
                        page: 1,
                        append: false,
                        updateUrl: false,
                      });
                    }
                  }}
                >
                  <ToggleButton value="list">
                    <Tooltip title={t('search.listView')}><ViewList /></Tooltip>
                  </ToggleButton>
                  <ToggleButton value="map">
                    <Tooltip title={t('search.mapView')}><MapIcon /></Tooltip>
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </Box>

            {/* Row 2: tag chips */}
            {allTags.length > 0 && (
              <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
                <FilterAlt fontSize="small" color="action" />
                {allTags.map((tag) => (
                  <Chip
                    key={tag.slug}
                    label={`${tag.icon ?? ''} ${t(`tags.${tag.slug}`, tag.name)}`.trim()}
                    size="small"
                    variant={selectedTags.includes(tag.slug) ? 'filled' : 'outlined'}
                    color={selectedTags.includes(tag.slug) ? 'primary' : 'default'}
                    onClick={() => toggleTag(tag.slug)}
                    sx={{ cursor: 'pointer' }}
                  />
                ))}
              </Box>
            )}
          </Stack>
        </Container>
      </Box>

      {/* ── Results area ── */}
      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Status bar */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {loading
              ? t('search.searching')
              : mapBbox
                ? t('search.resultsInArea', { count: total })
                : locationQuery
                  ? t('search.resultsForQuery', { count: total, query: locationQuery })
                  : t('search.results', { count: total })}
          </Typography>

          {mapBbox && (
            <Chip
              size="small"
              icon={<MyLocation fontSize="small" />}
              label={t('search.filteredByArea')}
              onDelete={() => {
                setMapBbox(null);
                setCurrentPage(1);
                setTotalPages(1);
                suppressNextBboxSearch.current = true;
                fetchResults({
                  tags: selectedTags,
                  location: locationQuery,
                  from,
                  to,
                  bbox: null,
                  page: 1,
                  append: false,
                  updateUrl: false,
                });
              }}
              color="info"
              variant="outlined"
            />
          )}

          {selectedTags.map((slug) => {
            const t = allTags.find((a) => a.slug === slug);
            return t ? (
              <Chip
                key={slug}
                size="small"
                label={`${t.icon ?? ''} ${t.name}`.trim()}
                onDelete={() => setSelectedTags((p) => p.filter((s) => s !== slug))}
              />
            ) : null;
          })}
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* ── LIST VIEW ── */}
        {view === 'list' && (
          <>
            {loading ? (
              <Grid container spacing={2}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <Grid key={i} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                    <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
                    <Skeleton sx={{ mt: 1 }} />
                    <Skeleton width="60%" />
                  </Grid>
                ))}
              </Grid>
            ) : places.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 10 }}>
                <LocationOn sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  {t('search.noResults')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('search.noResultsHint')}
                </Typography>
                {hasFilters && (
                  <Button sx={{ mt: 2 }} onClick={handleClear} startIcon={<Clear />}>
                    {t('search.clearFilters')}
                  </Button>
                )}
              </Box>
            ) : (
              <>
                <Grid container spacing={2}>
                  {places.map((place) => (
                    <Grid key={place.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                      <PlaceCard
                        place={place}
                        highlighted={highlightedId === place.id}
                        onMouseEnter={() => setHighlightedId(place.id)}
                        onMouseLeave={() => setHighlightedId(null)}
                      />
                    </Grid>
                  ))}
                </Grid>

                {/* Load More */}
                {currentPage < totalPages && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                    <Button
                      variant="outlined"
                      size="large"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      startIcon={loadingMore ? <CircularProgress size={18} /> : undefined}
                      sx={{ minWidth: 180 }}
                    >
                      {loadingMore ? t('search.loadingMore') : t('search.loadMore', { count: total - places.length })}
                    </Button>
                  </Box>
                )}
              </>
            )}
          </>
        )}

        {/* ── MAP VIEW ── */}
        {view === 'map' && (
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              height: 'calc(100vh - 230px)',
              minHeight: 500,
            }}
          >
            {/* Sidebar list */}
            <Box
              sx={{
                width: 300,
                flexShrink: 0,
                overflowY: 'auto',
                display: { xs: 'none', md: 'flex' },
                flexDirection: 'column',
              }}
            >
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Box key={i} sx={{ mb: 1.5 }}>
                    <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 1.5 }} />
                    <Skeleton sx={{ mt: 0.5 }} />
                    <Skeleton width="50%" />
                  </Box>
                ))
              ) : places.length === 0 ? (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('search.noResults')}
                    <br />{t('search.noResultsHint')}
                  </Typography>
                </Box>
              ) : (
                places.map((place) => (
                  <PlaceCardCompact
                    key={place.id}
                    place={place}
                    highlighted={highlightedId === place.id}
                    onMouseEnter={() => setHighlightedId(place.id)}
                    onMouseLeave={() => setHighlightedId(null)}
                  />
                ))
              )}
            </Box>

            <Divider
              orientation="vertical"
              flexItem
              sx={{ display: { xs: 'none', md: 'block' } }}
            />

            {/* Map */}
            <Box
              sx={{
                flex: 1,
                borderRadius: 2,
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <SearchMap
                pins={mapPins}
                highlightedId={highlightedId}
                onBoundsChange={handleBboxChange}
                onPinClick={(id: string) => {
                  const realId = id.startsWith('free__')
                    ? id.replace('free__', '')
                    : id;
                  const place = places.find((p) => p.id === realId);
                  if (place) {
                    router.push(
                      place.isFree ? `/locations/${place.slug}` : `/places/${place.slug}`
                    );
                  }
                }}
              />
            </Box>
          </Box>
        )}
      </Container>
    </Box>
  );
}

// ── Full place card (list view) ────────────────────────────────────────────

function PlaceCard({
  place,
  highlighted,
  onMouseEnter,
  onMouseLeave,
}: {
  place: SearchPlace;
  highlighted: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const tags: ActivityTag[] = place.isFree
    ? (place.tags ?? []).map((t) => t.tag)
    : place.activityTypes.flatMap((at) => at.tags.map((t) => t.tag));

  const uniqueTags = Array.from(new Map(tags.map((t) => [t.id, t])).values()).slice(0, 4);
  const href = place.isFree ? `/locations/${place.slug}` : `/places/${place.slug}`;
  const { t } = useTranslation('common');

  return (
    <Card
      component={NextLink}
      href={href}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      sx={{
        textDecoration: 'none',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        transition: 'box-shadow 0.2s, transform 0.2s',
        boxShadow: highlighted ? 6 : 1,
        transform: highlighted ? 'translateY(-2px)' : 'none',
        '&:hover': { boxShadow: 6, transform: 'translateY(-2px)' },
        position: 'relative',
      }}
    >
      {place.isFree && (
        <Chip
          icon={<Public sx={{ fontSize: '13px !important' }} />}
          label={t('search.community')}
          size="small"
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            zIndex: 2,
            bgcolor: '#7b3f00',
            color: 'white',
            fontWeight: 700,
            fontSize: 11,
            '& .MuiChip-icon': { color: 'white' },
          }}
        />
      )}

      {place.coverUrl ? (
        <CardMedia sx={{ height: 180, position: 'relative' }}>
          <Image
            src={place.coverUrl}
            alt={place.name}
            fill
            sizes="(max-width:600px) 100vw, 33vw"
            style={{ objectFit: 'cover' }}
          />
        </CardMedia>
      ) : (
        <Box
          sx={{
            height: 180,
            bgcolor: 'grey.100',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <LocationOn sx={{ fontSize: 48, color: 'grey.300' }} />
        </Box>
      )}

      <CardContent sx={{ flex: 1, pb: '12px !important' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
          {place.name}
        </Typography>

        {(place.city || place.country) && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <LocationOn sx={{ fontSize: 13, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              {[place.city, place.country].filter(Boolean).join(', ')}
            </Typography>
          </Box>
        )}

        {!place.isFree && place.averageRating !== null && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <Star sx={{ fontSize: 13, color: 'warning.main' }} />
            <Typography variant="caption" color="text.secondary">
              {place.averageRating.toFixed(1)} ({place.reviewCount})
            </Typography>
          </Box>
        )}

        {uniqueTags.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.75 }}>
            {uniqueTags.map((tag) => (
              <Chip
                key={tag.id}
                label={`${tag.icon ?? ''} ${t(`tags.${tag.slug}`, tag.name)}`.trim()}
                size="small"
                variant="outlined"
                sx={{ fontSize: 11, height: 22 }}
              />
            ))}
          </Box>
        )}

        {/* Spacer pushes button to bottom regardless of content height */}
        <Box sx={{ flexGrow: 1 }} />

        <Box sx={{ mt: 1.5 }}>
          <Button
            variant={place.isFree ? 'outlined' : 'contained'}
            size="small"
            fullWidth
            color={place.isFree ? 'inherit' : 'primary'}
            tabIndex={-1}
          >
            {place.isFree ? t('search.viewLocation') : t('search.bookNow')}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}

// ── Compact card (map sidebar) ─────────────────────────────────────────────

function PlaceCardCompact({
  place,
  highlighted,
  onMouseEnter,
  onMouseLeave,
}: {
  place: SearchPlace;
  highlighted: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const href = place.isFree ? `/locations/${place.slug}` : `/places/${place.slug}`;
  const { t } = useTranslation('common');

  return (
    <Card
      component={NextLink}
      href={href}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      sx={{
        textDecoration: 'none',
        display: 'flex',
        mb: 1,
        p: 1,
        gap: 1.5,
        alignItems: 'center',
        border: '2px solid',
        borderColor: highlighted ? 'primary.main' : 'transparent',
        boxShadow: highlighted ? 4 : 1,
        transition: 'border-color 0.15s, box-shadow 0.15s',
        '&:hover': { borderColor: 'primary.light', boxShadow: 3 },
      }}
    >
      <Box
        sx={{
          width: 64,
          height: 64,
          flexShrink: 0,
          borderRadius: 1,
          overflow: 'hidden',
          bgcolor: 'grey.100',
          position: 'relative',
        }}
      >
        {place.coverUrl ? (
          <Image
            src={place.coverUrl}
            alt={place.name}
            fill
            sizes="64px"
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LocationOn sx={{ color: 'grey.400', fontSize: 28 }} />
          </Box>
        )}
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
          {place.isFree && (
            <Chip
              label={t('common.free')}
              size="small"
              sx={{ bgcolor: '#7b3f00', color: 'white', fontSize: 10, height: 16, flexShrink: 0 }}
            />
          )}
          <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
            {place.name}
          </Typography>
        </Box>

        {(place.city || place.country) && (
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
            {[place.city, place.country].filter(Boolean).join(', ')}
          </Typography>
        )}

        {!place.isFree && place.averageRating !== null && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
            <Star sx={{ fontSize: 12, color: 'warning.main' }} />
            <Typography variant="caption" color="text.secondary">
              {place.averageRating.toFixed(1)}
            </Typography>
          </Box>
        )}
      </Box>
    </Card>
  );
}
