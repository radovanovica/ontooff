'use client';

import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  TextField,
  Button,
  Avatar,
  Alert,
  CircularProgress,
  Snackbar,
  Divider,
  Chip,
  Grid,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Person,
  Lock,
  Save,
  Visibility,
  VisibilityOff,
  Edit,
} from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from '@/i18n/client';
import { format } from 'date-fns';

// ─── Schemas ─────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Z]/, 'Must contain uppercase letter')
      .regex(/[0-9]/, 'Must contain a number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

// ─── TabPanel ────────────────────────────────────────────────────────────────

function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null;
}

// ─── Profile Tab ─────────────────────────────────────────────────────────────

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  image: string | null;
  role: string;
  createdAt: string;
  emailVerified: string | null;
}

function ProfileTab({ user, onUpdated }: { user: UserProfile; onUpdated: (updated: UserProfile) => void }) {
  const { t } = useTranslation('auth');
  const { update } = useSession();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name ?? '',
      phone: user.phone ?? '',
    },
  });

  const onSubmit = async (data: ProfileFormValues) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Update failed');
      onUpdated(json.data);
      // Sync NextAuth session
      await update({ name: json.data.name, image: json.data.image });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Avatar section */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 4 }}>
        <Avatar
          src={user.image ?? undefined}
          sx={{ width: 80, height: 80, fontSize: '2rem', bgcolor: 'primary.main' }}
        >
          {(user.name ?? user.email)[0].toUpperCase()}
        </Avatar>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{user.name ?? t('fields.name')}</Typography>
          <Typography variant="body2" color="text.secondary">{user.email}</Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
            <Chip label={user.role} size="small" color="primary" variant="outlined" />
            {user.emailVerified && (
              <Chip label="✓ Email verified" size="small" color="success" variant="outlined" />
            )}
          </Box>
        </Box>
      </Box>

      <Divider sx={{ mb: 3 }} />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 8 }}>
          <TextField
            {...register('name')}
            label={t('fields.name')}
            fullWidth
            error={!!errors.name}
            helperText={errors.name?.message}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            {...register('phone')}
            label={t('profile.phone', 'Phone')}
            fullWidth
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField
            value={user.email}
            label={t('fields.email')}
            fullWidth
            disabled
            helperText={t('profile.emailCannotChange', 'Email address cannot be changed')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            value={user.createdAt ? format(new Date(user.createdAt), 'MMMM d, yyyy') : '—'}
            label={t('profile.memberSince', 'Member since')}
            fullWidth
            disabled
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Button
            type="submit"
            variant="contained"
            disabled={saving || !isDirty}
            startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Save />}
          >
            {saving ? t('profile.saving', 'Saving…') : t('profile.saveChanges', 'Save Changes')}
          </Button>
        </Grid>
      </Grid>

      <Snackbar
        open={success}
        autoHideDuration={3000}
        onClose={() => setSuccess(false)}
        message={t('profile.updateSuccess', 'Profile updated successfully')}
      />
    </Box>
  );
}

// ─── Change Password Tab ─────────────────────────────────────────────────────

function ChangePasswordTab() {
  const { t } = useTranslation('auth');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordFormValues>({ resolver: zodResolver(passwordSchema) });

  const onSubmit = async (data: PasswordFormValues) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Failed');
      reset();
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ maxWidth: 480 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {t('resetPassword.resetSuccess')}
        </Alert>
      )}

      <Alert severity="info" sx={{ mb: 3 }}>
        {t('profile.passwordHint', 'Your password must be at least 8 characters and contain an uppercase letter and a number.')}
      </Alert>

      <TextField
        {...register('currentPassword')}
        label={t('profile.currentPassword', 'Current Password')}
        type={showCurrent ? 'text' : 'password'}
        fullWidth
        sx={{ mb: 2 }}
        error={!!errors.currentPassword}
        helperText={errors.currentPassword?.message}
        autoComplete="current-password"
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowCurrent((v) => !v)} edge="end">
                  {showCurrent ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />

      <TextField
        {...register('newPassword')}
        label={t('resetPassword.newPasswordLabel')}
        type={showNew ? 'text' : 'password'}
        fullWidth
        sx={{ mb: 2 }}
        error={!!errors.newPassword}
        helperText={errors.newPassword?.message ?? t('signUp.passwordHint')}
        autoComplete="new-password"
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowNew((v) => !v)} edge="end">
                  {showNew ? <VisibilityOff /> : <Visibility />}
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
        disabled={saving}
        startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Lock />}
      >
        {saving ? t('profile.saving', 'Saving…') : t('resetPassword.resetButton')}
      </Button>
    </Box>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { t } = useTranslation('auth');
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState(0);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth/signin?callbackUrl=/profile');
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/user/profile')
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error(d.error ?? 'Failed to load');
        setProfile(d.data);
      })
      .catch((e) => setFetchError(e.message))
      .finally(() => setLoading(false));
  }, [status]);

  if (status === 'loading' || loading) {
    return (
      <Box>
        <Navbar />
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  if (fetchError || !profile) {
    return (
      <Box>
        <Navbar />
        <Container maxWidth="md" sx={{ py: 6 }}>
          <Alert severity="error">{fetchError ?? 'Profile not found'}</Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box>
      <Navbar />

      {/* Page hero */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #2d5a27 0%, #4a7c59 100%)',
          pt: 9,
          pb: 5,
          color: 'white',
        }}
      >
        <Container maxWidth="md">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              src={profile.image ?? undefined}
              sx={{ width: 64, height: 64, fontSize: '1.75rem', bgcolor: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.5)' }}
            >
              {(profile.name ?? profile.email)[0].toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.25 }}>
                {profile.name ?? session?.user?.email}
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.8 }}>
                {profile.email}
              </Typography>
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: 5 }}>
        <Paper variant="outlined" sx={{ borderRadius: 2 }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab icon={<Person />} iconPosition="start" label={t('profile.tab', 'Profile')} />
            <Tab icon={<Lock />} iconPosition="start" label={t('profile.changePasswordTab', 'Change Password')} />
          </Tabs>

          <Box sx={{ p: { xs: 2, sm: 4 } }}>
            <TabPanel value={tab} index={0}>
              <ProfileTab user={profile} onUpdated={setProfile} />
            </TabPanel>
            <TabPanel value={tab} index={1}>
              <ChangePasswordTab />
            </TabPanel>
          </Box>
        </Paper>

        {/* Danger Zone */}
        <Paper variant="outlined" sx={{ borderRadius: 2, mt: 3, p: 3, borderColor: 'error.light' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'error.main', mb: 1 }}>
            <Edit sx={{ fontSize: 18, mr: 0.5, verticalAlign: 'middle' }} />
            {t('profile.accountActions', 'Account Actions')}
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('profile.signOutDesc', 'Sign out of your account on this device.')}
          </Typography>
          <Button
            variant="outlined"
            color="error"
            onClick={() => signOut({ callbackUrl: '/' })}
          >
            {t('profile.signOut', 'Sign Out')}
          </Button>
        </Paper>
      </Container>
    </Box>
  );
}
