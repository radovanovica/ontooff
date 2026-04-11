'use client';

import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Rating,
  Paper,
  Stack,
} from '@mui/material';
import { Star } from '@mui/icons-material';
import { useState } from 'react';
import { useTranslation } from '@/i18n/client';

interface ReviewFormProps {
  placeId: string;
  activityLocationId?: string;
  /** Pass either editToken (from URL/email) OR registrationNumber+email */
  editToken?: string;
  registrationNumber?: string;
  guestEmail?: string;
  /** Called after successful submission */
  onSubmitted?: () => void;
}

export default function ReviewForm({
  placeId,
  activityLocationId,
  editToken,
  registrationNumber: initialRegNumber,
  guestEmail: initialEmail,
  onSubmitted,
}: ReviewFormProps) {
  const { t } = useTranslation('registration');

  // If no editToken provided, user must enter booking number + email
  const needsVerification = !editToken && !initialRegNumber;
  const [verified, setVerified] = useState(!needsVerification);
  const [regNumber, setRegNumber] = useState(initialRegNumber ?? '');
  const [email, setEmail] = useState(initialEmail ?? '');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const [rating, setRating] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyError(null);
    try {
      const params = new URLSearchParams({ placeId, registrationNumber: regNumber, email });
      if (activityLocationId) params.set('activityLocationId', activityLocationId);
      const res = await fetch(`/api/reviews/check?${params}`);
      const json = await res.json();
      if (!res.ok) {
        setVerifyError(json.error ?? t('review.notFound'));
        return;
      }
      if (json.notFound) { setVerifyError(t('review.notFound')); return; }
      if (json.notEligible) { setVerifyError(t('review.notEligible')); return; }
      if (json.alreadyReviewed) {
        setVerified(true);
        setError(t('review.alreadyReviewed'));
        setSubmitted(true);
        return;
      }
      setVerified(true);
    } catch {
      setVerifyError(t('review.notFound'));
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async () => {
    if (!rating) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeId,
          activityLocationId,
          editToken,
          registrationNumber: initialRegNumber ?? regNumber,
          email: initialEmail ?? email,
          rating,
          title: title || undefined,
          body,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setError(t('review.alreadyReviewed'));
          setSubmitted(true);
        } else {
          setError(json.error ?? t('errors.submitFailed'));
        }
        return;
      }
      setSubmitted(true);
      onSubmitted?.();
    } catch {
      setError(t('errors.submitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Alert severity="success" icon={<Star />}>
        {error ?? t('review.submitted')}
      </Alert>
    );
  }

  if (!verified) {
    return (
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
          {t('review.verifyTitle')}
        </Typography>
        {verifyError && <Alert severity="error" sx={{ mb: 2 }}>{verifyError}</Alert>}
        <Stack spacing={2}>
          <TextField
            label={t('review.bookingNumber')}
            value={regNumber}
            onChange={(e) => setRegNumber(e.target.value)}
            size="small"
            fullWidth
          />
          <TextField
            label={t('review.bookingEmail')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            size="small"
            fullWidth
          />
          <Button
            variant="contained"
            onClick={handleVerify}
            disabled={verifying || !regNumber || !email}
          >
            {verifying ? t('review.verifying') : t('review.verify')}
          </Button>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
        {t('review.title')}
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack spacing={2.5}>
        {/* Star rating */}
        <Box>
          <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600 }}>
            {t('review.ratingLabel')}
          </Typography>
          <Rating
            value={rating}
            onChange={(_, v) => setRating(v)}
            size="large"
            sx={{ color: 'warning.main' }}
          />
        </Box>

        {/* Optional title */}
        <TextField
          label={t('review.titleLabel')}
          placeholder={t('review.titlePlaceholder')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          size="small"
          fullWidth
          slotProps={{ htmlInput: { maxLength: 120 } }}
        />

        {/* Body */}
        <TextField
          label={t('review.bodyLabel')}
          placeholder={t('review.bodyPlaceholder')}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          multiline
          rows={4}
          fullWidth
          slotProps={{ htmlInput: { maxLength: 2000 } }}
          helperText={`${body.length} / 2000`}
        />

        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting || !rating || body.length < 10}
          size="large"
        >
          {submitting ? t('review.submitting') : t('review.submit')}
        </Button>
      </Stack>
    </Paper>
  );
}
