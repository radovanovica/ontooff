'use client';

import { Box, Button, CircularProgress, Paper, Typography } from '@mui/material';
import { CheckCircle, Error as ErrorIcon } from '@mui/icons-material';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslation } from '@/i18n/client';

export default function VerifyEmailPage() {
  const { t } = useTranslation('auth');
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No token provided');
      return;
    }
    fetch(`/api/auth/verify-email?token=${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success || data.message) {
          setStatus('success');
        } else {
          setStatus('error');
          setMessage(data.error ?? 'Verification failed');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('An error occurred');
      });
  }, [token]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        px: 2,
      }}
    >
      <Paper elevation={3} sx={{ p: 5, width: '100%', maxWidth: 420, borderRadius: 3, textAlign: 'center' }}>
        {status === 'loading' && (
          <>
            <CircularProgress size={56} sx={{ mb: 3 }} />
            <Typography variant="h6">{t('verifyEmail.loading')}</Typography>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              {t('verifyEmail.successTitle')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              {t('verifyEmail.successBody')}
            </Typography>
            <Button component={Link} href="/auth/signin" variant="contained" fullWidth size="large">
              {t('signIn.button')}
            </Button>
          </>
        )}
        {status === 'error' && (
          <>
            <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              {t('verifyEmail.errorTitle')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              {message || t('verifyEmail.errorBody')}
            </Typography>
            <Button component={Link} href="/auth/signup" variant="outlined" fullWidth>
              {t('signUp.link')}
            </Button>
          </>
        )}
      </Paper>
    </Box>
  );
}
