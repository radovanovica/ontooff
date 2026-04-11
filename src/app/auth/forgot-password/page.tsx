'use client';

import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Paper,
} from '@mui/material';
import { MarkEmailRead, ArrowBack } from '@mui/icons-material';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from '@/i18n/client';

const schema = z.object({
  email: z.string().email(),
});
type FormValues = z.infer<typeof schema>;

function ForgotPasswordContent() {
  const { t } = useTranslation('auth');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Request failed');
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #e8f5e9 0%, #f5f0eb 100%)',
        p: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 440,
          borderRadius: 3,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #2d5a27 0%, #4a7c59 100%)',
            p: 4,
            textAlign: 'center',
          }}
        >
          <Image src="/assets/images/logo.svg" alt="ontooff" width={48} height={48} style={{ marginBottom: 12 }} />
          <Typography variant="h5" sx={{ color: 'white', fontWeight: 800, mb: 0.5 }}>
            {t('resetPassword.requestTitle')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)' }}>
            {t('resetPassword.requestSubtitle')}
          </Typography>
        </Box>

        <Box sx={{ p: 4 }}>
          {success ? (
            <Box sx={{ textAlign: 'center' }}>
              <MarkEmailRead sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                {t('resetPassword.sentTitle', 'Check your email! 📬')}
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                {t('resetPassword.requestSuccess', { email: getValues('email') })}
              </Typography>
              <Button component={Link} href="/auth/signin" variant="outlined" startIcon={<ArrowBack />} fullWidth>
                {t('verifyEmail.signInButton')}
              </Button>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleSubmit(onSubmit)}>
              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

              <TextField
                {...register('email')}
                label={t('resetPassword.emailLabel')}
                type="email"
                fullWidth
                sx={{ mb: 3 }}
                error={!!errors.email}
                helperText={errors.email?.message}
                autoComplete="email"
                autoFocus
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={loading}
                sx={{ mb: 2 }}
              >
                {loading
                  ? <CircularProgress size={20} color="inherit" />
                  : t('resetPassword.requestButton')}
              </Button>

              <Box sx={{ textAlign: 'center' }}>
                <Link
                  href="/auth/signin"
                  style={{ color: '#2d5a27', fontSize: '0.875rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  ← {t('signIn.button')}
                </Link>
              </Box>
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></Box>}>
      <ForgotPasswordContent />
    </Suspense>
  );
}
