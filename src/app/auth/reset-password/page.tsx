'use client';

import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff, CheckCircle, ArrowBack, LockReset } from '@mui/icons-material';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from '@/i18n/client';

const schema = z
  .object({
    password: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Z]/, 'Must contain uppercase letter')
      .regex(/[0-9]/, 'Must contain a number'),
    confirmPassword: z.string().min(1),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

function ResetPasswordContent() {
  const { t } = useTranslation('auth');
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    if (!token) {
      setError('Invalid reset link. Please request a new one.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: data.password }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Reset failed');
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
        <Alert severity="error" sx={{ maxWidth: 440, width: '100%' }}>
          Invalid or missing reset token. Please{' '}
          <Link href="/auth/forgot-password" style={{ color: 'inherit' }}>request a new reset link</Link>.
        </Alert>
      </Box>
    );
  }

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
            {t('resetPassword.newPasswordTitle')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)' }}>
            {t('signIn.subtitle')}
          </Typography>
        </Box>

        <Box sx={{ p: 4 }}>
          {success ? (
            <Box sx={{ textAlign: 'center' }}>
              <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                {t('resetPassword.resetSuccess')}
              </Typography>
              <Button
                component={Link}
                href="/auth/signin"
                variant="contained"
                startIcon={<ArrowBack />}
                fullWidth
                sx={{ mt: 2 }}
              >
                {t('verifyEmail.signInButton')}
              </Button>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleSubmit(onSubmit)}>
              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

              <TextField
                {...register('password')}
                label={t('resetPassword.newPasswordLabel')}
                type={showPassword ? 'text' : 'password'}
                fullWidth
                sx={{ mb: 2 }}
                error={!!errors.password}
                helperText={errors.password?.message ?? t('signUp.passwordHint')}
                autoComplete="new-password"
                autoFocus
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword((v) => !v)} edge="end">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <TextField
                {...register('confirmPassword')}
                label={t('resetPassword.confirmPasswordLabel')}
                type={showConfirm ? 'text' : 'password'}
                fullWidth
                sx={{ mb: 3 }}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword?.message}
                autoComplete="new-password"
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowConfirm((v) => !v)} edge="end">
                          {showConfirm ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={loading}
                startIcon={loading ? undefined : <LockReset />}
                sx={{ mb: 2 }}
              >
                {loading
                  ? <CircularProgress size={20} color="inherit" />
                  : t('resetPassword.resetButton')}
              </Button>

              <Box sx={{ textAlign: 'center' }}>
                <Link href="/auth/signin" style={{ color: '#2d5a27', fontSize: '0.875rem', textDecoration: 'none' }}>
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></Box>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
