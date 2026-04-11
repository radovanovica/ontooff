'use client';

import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  Grid,
} from '@mui/material';
import { Business as BusinessIcon } from '@mui/icons-material';
import Image from 'next/image';
import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from '@/i18n/client';

const schema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  website: z.string().url('Must be a valid URL (https://...)').optional().or(z.literal('')),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function RegisterOrgPage() {
  const { t } = useTranslation('auth');
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
      const res = await fetch('/api/auth/register-org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Registration failed');
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
        <Paper elevation={3} sx={{ p: 5, width: '100%', maxWidth: 480, borderRadius: 3, textAlign: 'center' }}>
          <Typography variant="h2" sx={{ mb: 2 }}>🏢</Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            {t('registerOrg.successTitle', 'Registration Submitted!')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {t('registerOrg.successBody', 'Your organization registration is under review. We will send you an email once approved.')}
          </Typography>
          <Button component={Link} href="/" variant="contained" color="primary">
            {t('registerOrg.backHome', 'Back to Home')}
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
        px: 2,
        py: 6,
      }}
    >
      <Paper elevation={3} sx={{ p: { xs: 3, sm: 5 }, width: '100%', maxWidth: 640, borderRadius: 3 }}>
        {/* Logo */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Link href="/">
            <Image
              src="/assets/images/logo.svg"
              alt="ontooff"
              width={120}
              height={40}
              unoptimized
              style={{ objectFit: 'contain' }}
            />
          </Link>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <BusinessIcon color="primary" />
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {t('registerOrg.title', 'Register Your Organization')}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {t('registerOrg.subtitle', 'Fill in your organization details. Our team will review and approve your registration.')}
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Grid container spacing={2}>
            <Grid size={12}>
              <TextField
                label={t('registerOrg.fields.name', 'Organization Name')}
                fullWidth
                required
                {...register('name')}
                error={!!errors.name}
                helperText={errors.name?.message}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label={t('registerOrg.fields.email', 'Contact Email')}
                fullWidth
                required
                type="email"
                {...register('email')}
                error={!!errors.email}
                helperText={errors.email?.message}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label={t('registerOrg.fields.phone', 'Phone')}
                fullWidth
                {...register('phone')}
                error={!!errors.phone}
                helperText={errors.phone?.message}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label={t('registerOrg.fields.city', 'City')}
                fullWidth
                {...register('city')}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label={t('registerOrg.fields.country', 'Country')}
                fullWidth
                {...register('country')}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label={t('registerOrg.fields.address', 'Address')}
                fullWidth
                {...register('address')}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label={t('registerOrg.fields.website', 'Website (optional)')}
                fullWidth
                placeholder="https://yourwebsite.com"
                {...register('website')}
                error={!!errors.website}
                helperText={errors.website?.message}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label={t('registerOrg.fields.description', 'Description')}
                fullWidth
                multiline
                rows={4}
                placeholder={t('registerOrg.fields.descriptionPlaceholder', 'Tell us about your organization, the activities you offer, and where you are located...')}
                {...register('description')}
              />
            </Grid>
          </Grid>

          <Button
            type="submit"
            variant="contained"
            size="large"
            fullWidth
            disabled={loading}
            sx={{ mt: 3, py: 1.5 }}
          >
            {loading ? <CircularProgress size={22} color="inherit" /> : t('registerOrg.submit', 'Submit Registration')}
          </Button>

          <Typography variant="body2" sx={{ mt: 2, textAlign: 'center', color: 'text.secondary' }}>
            {t('registerOrg.hasAccount', 'Already have an account?')}{' '}
            <Link href="/auth/signin" style={{ color: 'inherit', fontWeight: 600 }}>
              {t('nav.signIn', 'Sign In')}
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
