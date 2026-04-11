'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import { RateReview } from '@mui/icons-material';
import Navbar from '@/components/layout/Navbar';
import ReviewForm from '@/components/reviews/ReviewForm';

interface CheckResult {
  eligible: boolean;
  alreadyReviewed: boolean;
  notFound?: boolean;
  notEligible?: boolean;
  guestName?: string;
  activityLocationId?: string;
  placeId?: string;
}

export default function ReviewPage() {
  const { editToken } = useParams<{ editToken: string }>();

  const [loading, setLoading] = useState(true);
  const [check, setCheck] = useState<CheckResult | null>(null);
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // First resolve the placeId from the editToken via a registration lookup
  useEffect(() => {
    if (!editToken) return;

    // We need the placeId to call check. Resolve via a dedicated endpoint:
    fetch(`/api/registrations/by-edit-token/${editToken}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error(d.error ?? 'Not found');
        setPlaceId(d.data.placeId);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [editToken]);

  useEffect(() => {
    if (!placeId) return;
    setLoading(true);
    fetch(`/api/reviews/check?editToken=${encodeURIComponent(editToken)}&placeId=${encodeURIComponent(placeId)}`)
      .then((r) => r.json())
      .then((d) => setCheck(d))
      .catch(() => setError('Could not verify your booking.'))
      .finally(() => setLoading(false));
  }, [editToken, placeId]);

  return (
    <>
      <Navbar />
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <RateReview sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Leave a Review
          </Typography>
        </Box>

        {loading && (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {!loading && !error && check && (
          <>
            {check.notFound && (
              <Alert severity="error">
                This review link is invalid or has expired. Please use the link from your booking confirmation email.
              </Alert>
            )}
            {check.notEligible && (
              <Alert severity="warning">
                Reviews can only be submitted for confirmed or completed bookings.
              </Alert>
            )}
            {check.alreadyReviewed && (
              <Alert severity="info">
                You have already submitted a review for this booking. Thank you!
              </Alert>
            )}
            {check.eligible && placeId && (
              <>
                {check.guestName && (
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    Hi <strong>{check.guestName}</strong>, we&apos;d love to hear about your experience!
                  </Typography>
                )}
                <ReviewForm
                  placeId={placeId}
                  activityLocationId={check.activityLocationId}
                  editToken={editToken}
                />
              </>
            )}
          </>
        )}
      </Container>
    </>
  );
}
