'use client';

import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Stack,
  Chip,
  Button,
  Paper,
  Divider,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tabs,
  Tab,
  Rating,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Delete,
  FormatQuote,
} from '@mui/icons-material';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/i18n/client';

interface ReviewData {
  id: string;
  guestName: string;
  guestEmail: string;
  rating: number;
  title: string | null;
  body: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  activityLocation: { id: string; name: string } | null;
  registration: { registrationNumber: string; startDate: string; endDate: string } | null;
}

interface ReviewsTabProps {
  placeId: string;
}

export default function ReviewsTab({ placeId }: ReviewsTabProps) {
  const { t } = useTranslation('owner');

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [pendingCount, setPendingCount] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<ReviewData | null>(null);

  const fetchReviews = useCallback(() => {
    setLoading(true);
    const qs = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
    fetch(`/api/reviews/${placeId}${qs}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error(d.error ?? 'Failed to load reviews');
        setReviews(d.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [placeId, statusFilter]);

  // Always fetch pending count for the badge
  useEffect(() => {
    fetch(`/api/reviews/${placeId}?status=pending`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setPendingCount(d.data.length); })
      .catch(() => {});
  }, [placeId]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const handleAction = async (reviewId: string, action: 'approve' | 'reject') => {
    setActionError(null);
    const res = await fetch(`/api/reviews/${reviewId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) { setActionError(t('reviews.actionFailed')); return; }
    fetchReviews();
    // Refresh pending count
    fetch(`/api/reviews/${placeId}?status=pending`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setPendingCount(d.data.length); })
      .catch(() => {});
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setActionError(null);
    const res = await fetch(`/api/reviews/${confirmDelete.id}`, { method: 'DELETE' });
    setConfirmDelete(null);
    if (!res.ok) { setActionError(t('reviews.actionFailed')); return; }
    fetchReviews();
  };

  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / totalReviews).toFixed(1)
    : null;

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>{t('reviews.title')}</Typography>

      {/* Summary */}
      {statusFilter === 'all' && totalReviews > 0 && (
        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          <Paper variant="outlined" sx={{ px: 3, py: 1.5, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>{averageRating}</Typography>
            <Box>
              <Rating value={parseFloat(averageRating ?? '0')} readOnly precision={0.1} size="small" />
              <Typography variant="caption" color="text.secondary">{t('reviews.averageRating')}</Typography>
            </Box>
          </Paper>
          <Paper variant="outlined" sx={{ px: 3, py: 1.5, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>{totalReviews}</Typography>
            <Typography variant="caption" color="text.secondary">{t('reviews.totalReviews')}</Typography>
          </Paper>
          {pendingCount > 0 && (
            <Paper variant="outlined" sx={{ px: 3, py: 1.5, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1, borderColor: 'warning.main' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>{pendingCount}</Typography>
              <Typography variant="caption" color="text.secondary">{t('reviews.pending')}</Typography>
            </Paper>
          )}
        </Stack>
      )}

      {actionError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>{actionError}</Alert>}

      {/* Filter tabs */}
      <Tabs
        value={statusFilter}
        onChange={(_, v) => setStatusFilter(v)}
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
      >
        <Tab value="all" label={t('reviews.all')} />
        <Tab
          value="pending"
          label={
            pendingCount > 0
              ? <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                  {t('reviews.pending')}
                  <Chip label={pendingCount} size="small" color="warning" sx={{ height: 18, fontSize: '0.65rem' }} />
                </Box>
              : t('reviews.pending')
          }
        />
        <Tab value="approved" label={t('reviews.approved')} />
        <Tab value="rejected" label={t('reviews.rejected')} />
      </Tabs>

      {loading && (
        <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>
      )}
      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && reviews.length === 0 && (
        <Typography color="text.secondary">{t('reviews.empty')}</Typography>
      )}

      {!loading && !error && reviews.length > 0 && (
        <Stack spacing={2}>
          {reviews.map((review) => (
            <Paper key={review.id} variant="outlined" sx={{ p: 2.5, borderRadius: 2, borderLeft: 4, borderLeftColor: review.status === 'REJECTED' ? 'error.main' : review.status === 'APPROVED' ? 'success.main' : 'warning.main' }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40, fontSize: '0.9rem' }}>
                  {review.guestName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 0.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{review.guestName}</Typography>
                    <Rating value={review.rating} readOnly size="small" />
                    <Chip
                      size="small"
                      label={review.status === 'REJECTED' ? t('reviews.rejected') : review.status === 'APPROVED' ? t('reviews.approved') : t('reviews.pending')}
                      color={review.status === 'REJECTED' ? 'error' : review.status === 'APPROVED' ? 'success' : 'warning'}
                    />
                    {review.activityLocation && (
                      <Chip size="small" label={review.activityLocation.name} variant="outlined" />
                    )}
                  </Box>
                  {review.registration && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      #{review.registration.registrationNumber}
                    </Typography>
                  )}
                  {review.title && (
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>{review.title}</Typography>
                  )}
                  <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'flex-start' }}>
                    <FormatQuote sx={{ fontSize: 16, color: 'text.disabled', mt: 0.2, transform: 'scaleX(-1)' }} />
                    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                      {review.body}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
                    {new Date(review.createdAt).toLocaleDateString()}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 1.5 }} />

              <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                {review.status === 'PENDING' && (
                  <>
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      startIcon={<CheckCircle />}
                      onClick={() => handleAction(review.id, 'approve')}
                    >
                      {t('reviews.approve')}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<Cancel />}
                      onClick={() => handleAction(review.id, 'reject')}
                    >
                      {t('reviews.reject')}
                    </Button>
                  </>
                )}
                {review.status === 'APPROVED' && (
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    startIcon={<Cancel />}
                    onClick={() => handleAction(review.id, 'reject')}
                  >
                    {t('reviews.reject')}
                  </Button>
                )}
                {review.status === 'REJECTED' && (
                  <Button
                    size="small"
                    variant="outlined"
                    color="success"
                    startIcon={<CheckCircle />}
                    onClick={() => handleAction(review.id, 'approve')}
                  >
                    {t('reviews.approve')}
                  </Button>
                )}
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  startIcon={<Delete />}
                  onClick={() => setConfirmDelete(review)}
                >
                  {t('reviews.delete')}
                </Button>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('reviews.delete')}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t('reviews.deleteConfirm')}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>{t('common.cancel')}</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>{t('reviews.delete')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
