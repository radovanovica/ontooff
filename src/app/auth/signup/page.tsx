'use client';

import {
  Box,
  Button,
  Divider,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Paper,
} from '@mui/material';
import { Google as GoogleIcon } from '@mui/icons-material';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from '@/i18n/client';

const schema = z
  .object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

export default function SignUpPage() {
  const { t } = useTranslation('auth');
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.name, email: data.email, password: data.password }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? 'Registration failed');
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', px: 2 }}>
        <Paper elevation={3} sx={{ p: 5, width: '100%', maxWidth: 440, borderRadius: 3, textAlign: 'center' }}>
          <Typography variant="h2" sx={{ mb: 2 }}>✉️</Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            {t('signUp.verifyEmailTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('signUp.verifyEmailBody')}
          </Typography>
          <Button component={Link} href="/auth/signin" variant="contained" sx={{ mt: 4 }} fullWidth>
            {t('signIn.button')}
          </Button>
        </Paper>
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
        bgcolor: 'background.default',
        py: 4,
        px: 2,
      }}
    >
      <Paper elevation={3} sx={{ p: { xs: 3, sm: 5 }, width: '100%', maxWidth: 440, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 0.5 }}>
          <Image src="/assets/images/logo.svg" alt="ontooff" width={40} height={40} />
          <Typography variant="h5" sx={{ fontWeight: 700, textAlign: 'center' }}>
            ontooff
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 4 }}>
          {t('signUp.subtitle')}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Button
          fullWidth
          variant="outlined"
          size="large"
          startIcon={<GoogleIcon />}
          onClick={() => signIn('google', { callbackUrl: '/' })}
          sx={{ mb: 2 }}
        >
          {t('signUp.withGoogle')}
        </Button>

        <Divider sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary">
            {t('signIn.orEmail')}
          </Typography>
        </Divider>

        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <TextField
            {...register('name')}
            label={t('fields.name')}
            fullWidth
            autoComplete="name"
            error={!!errors.name}
            helperText={errors.name?.message}
            sx={{ mb: 2 }}
          />
          <TextField
            {...register('email')}
            label={t('fields.email')}
            type="email"
            fullWidth
            autoComplete="email"
            error={!!errors.email}
            helperText={errors.email?.message}
            sx={{ mb: 2 }}
          />
          <TextField
            {...register('password')}
            label={t('fields.password')}
            type="password"
            fullWidth
            autoComplete="new-password"
            error={!!errors.password}
            helperText={errors.password?.message}
            sx={{ mb: 2 }}
          />
          <TextField
            {...register('confirmPassword')}
            label={t('fields.confirmPassword')}
            type="password"
            fullWidth
            autoComplete="new-password"
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword?.message}
            sx={{ mb: 3 }}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : undefined}
          >
            {t('signUp.button')}
          </Button>
        </Box>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2">
            {t('signUp.haveAccount')}{' '}
            <Link href="/auth/signin" style={{ color: 'inherit', fontWeight: 600 }}>
              {t('signIn.link')}
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
