'use client';

import {
  Box,
  Typography,
  Rating,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Stack,
  Avatar,
  Button,
} from '@mui/material';
import { Star, StarBorder } from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';

interface ReviewItem {
  id: string;
  guestName: string;
  rating: number;
  title: string | null;
  body: string;
  createdAt: string;
  activityLocation?: { id: string; name: string } | null;
}

interface ReviewMeta {
  total: number;
  averageRating: number | null;
  totalRatings: number;
  ratingBreakdown?: Record<number, number>;
  totalPages?: number;
}

interface ReviewListProps {
  placeId?: string;
  locationId?: string;
  freeLocationId?: string;
  refreshTrigger?: number;
}

export default function ReviewList({ placeId, locationId, freeLocationId, refreshTrigger = 0 }: ReviewListProps) {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [meta, setMeta] = useState<ReviewMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = (p: number, append: boolean) => {
    if (p === 1) setLoading(true); else setLoadingMore(true);
    const params = new URLSearchParams({ page: String(p), pageSize: '20' });
    if (placeId) params.set('placeId', placeId);
    if (locationId) params.set('locationId', locationId);
    if (freeLocationId) params.set('freeLocationId', freeLocationId);

    fetch(`/api/reviews?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error(d.error ?? 'Failed to load reviews');
        setReviews((prev) => append ? [...prev, ...d.data] : d.data);
        setMeta(d.meta);
        setPage(p);
      })
      .catch((e) => setError(e.message))
      .finally(() => { setLoading(false); setLoadingMore(false); });
  };

  useEffect(() => {
    fetchPage(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeId, locationId, freeLocationId, refreshTrigger]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (reviews.length === 0) {
    if (freeLocationId) {
      return (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2, fontStyle: 'italic' }}>
          No reviews yet. Be the first to share your experience!
        </Typography>
      );
    }
    return null;
  }

  return (
    <Box>
      {/* Aggregate header */}
      {meta && meta.totalRatings > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h3" sx={{ fontWeight: 800, lineHeight: 1 }}>
              {meta.averageRating?.toFixed(1)}
            </Typography>
            <Box>
              <Rating
                value={meta.averageRating ?? 0}
                precision={0.1}
                readOnly
                size="medium"
                icon={<Star fontSize="inherit" sx={{ color: 'warning.main' }} />}
                emptyIcon={<StarBorder fontSize="inherit" />}
              />
              <Typography variant="caption" color="text.secondary">
                {meta.totalRatings} {meta.totalRatings === 1 ? 'review' : 'reviews'}
              </Typography>
            </Box>
          </Box>

          {/* Rating distribution chips — sourced from API aggregate, not page slice */}
          {[5, 4, 3, 2, 1].map((star) => {
            const count = meta?.ratingBreakdown?.[star] ?? 0;
            if (count === 0) return null;
            return (
              <Chip
                key={star}
                icon={<Star sx={{ color: 'warning.main', fontSize: '0.9rem' }} />}
                label={`${star} · ${count}`}
                size="small"
                variant="outlined"
                sx={{ borderColor: 'warning.main', color: 'text.secondary' }}
              />
            );
          })}
        </Box>
      )}

      <Divider sx={{ mb: 3 }} />

      <Stack spacing={3}>
        {reviews.map((review) => (
          <Box key={review.id}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1 }}>
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: 'primary.main',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {review.guestName.charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {review.guestName}
                  </Typography>
                  {review.activityLocation && (
                    <Chip
                      label={review.activityLocation.name}
                      size="small"
                      variant="outlined"
                      sx={{ height: 18, fontSize: '0.65rem' }}
                    />
                  )}
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                    {format(new Date(review.createdAt), 'MMM d, yyyy')}
                  </Typography>
                </Box>
                <Rating
                  value={review.rating}
                  readOnly
                  size="small"
                  icon={<Star fontSize="inherit" sx={{ color: 'warning.main' }} />}
                  emptyIcon={<StarBorder fontSize="inherit" />}
                  sx={{ mt: 0.25 }}
                />
              </Box>
            </Box>

            {review.title && (
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, pl: '52px' }}>
                {review.title}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line', pl: '52px' }}>
              {review.body}
            </Typography>

            <Divider sx={{ mt: 3 }} />
          </Box>
        ))}
      </Stack>

      {/* Load More */}
      {meta && page < (meta.totalPages ?? 1) && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => fetchPage(page + 1, true)}
            disabled={loadingMore}
          >
            {loadingMore ? 'Loading…' : `Load more (${meta.total - reviews.length} remaining)`}
          </Button>
        </Box>
      )}
    </Box>
  );
}
