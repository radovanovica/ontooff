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
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from '@/i18n/client';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type FormValues = z.infer<typeof schema>;

export default function SignInPage() {
  return (
    <Suspense fallback={(
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    )}
    >
      <SignInPageContent />
    </Suspense>
  );
}

function SignInPageContent() {
  const { t } = useTranslation('auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/';
  const error = searchParams.get('error');

  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    setAuthError(null);
    const result = await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setAuthError(t(`errors.${result.error}`) ?? t('errors.default'));
    } else {
      router.push(callbackUrl);
    }
  };

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl });
  };

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
      <Paper
        elevation={3}
        sx={{ p: { xs: 3, sm: 5 }, width: '100%', maxWidth: 440, borderRadius: 3 }}
      >
        {/* Logo */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 0.5 }}>
          <Image src="/assets/images/logo.svg" alt="ontooff" width={40} height={40} />
          <Typography variant="h5" sx={{ fontWeight: 700, textAlign: 'center' }}>
            ontooff
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 4 }}>
          {t('signIn.subtitle')}
        </Typography>

        {(error || authError) && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {authError ?? t(`errors.${error}`) ?? t('errors.default')}
          </Alert>
        )}

        {/* Google */}
        <Button
          fullWidth
          variant="outlined"
          size="large"
          startIcon={<GoogleIcon />}
          onClick={handleGoogleSignIn}
          sx={{ mb: 2 }}
        >
          {t('signIn.withGoogle')}
        </Button>

        <Divider sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary">
            {t('signIn.orEmail')}
          </Typography>
        </Divider>

        {/* Email + password form */}
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
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
            autoComplete="current-password"
            error={!!errors.password}
            helperText={errors.password?.message}
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
            {t('signIn.button')}
          </Button>
        </Box>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="body2">
            {t('signIn.noAccount')}{' '}
            <Link href="/auth/signup" style={{ color: 'inherit', fontWeight: 600 }}>
              {t('signUp.link')}
            </Link>
          </Typography>
          <Typography variant="body2">
            <Link href="/auth/forgot-password" style={{ color: 'inherit' }}>
              {t('signIn.forgotPassword')}
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
