'use client';

import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Switch,
} from '@mui/material';
import { Search, Edit } from '@mui/icons-material';
import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { useTranslation } from '@/i18n/client';
import { UserRole } from '@/types';
import PageHeader from '@/components/ui/PageHeader';

interface UserRow {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  _count?: { registrations: number };
}

export default function AdminUsersPage() {
  const { t } = useTranslation('admin');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      setUsers(data.data?.items ?? data.items ?? []);
    } catch {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => {
    const t = setTimeout(fetchUsers, 300);
    return () => clearTimeout(t);
  }, [fetchUsers]);

  const handleToggleActive = async (user: UserRow) => {
    await fetch(`/api/admin/users`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: user.id, isActive: !user.isActive }),
    });
    fetchUsers();
  };

  const handleRoleChange = async (userId: string, role: UserRole) => {
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: userId, role }),
    });
    fetchUsers();
  };

  const roleColor: Record<UserRole, 'error' | 'warning' | 'default'> = {
    [UserRole.SUPER_ADMIN]: 'error',
    [UserRole.PLACE_OWNER]: 'warning',
    [UserRole.USER]: 'default',
  };

  return (
    <Box>
      <PageHeader
        title={t('users.title')}
        breadcrumbs={[
          { label: t('dashboard.title'), href: '/admin' },
          { label: t('users.title') },
        ]}
      />

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('users.searchPlaceholder')}
          size="small"
          sx={{ minWidth: 240 }}
          slotProps={{
            input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> },
          }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>{t('users.roleFilter')}</InputLabel>
          <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} label={t('users.roleFilter')}>
            <MenuItem value="">{t('common.all')}</MenuItem>
            {Object.values(UserRole).map((r) => (
              <MenuItem key={r} value={r}>{r}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 700 }}>{t('users.columns.name')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('users.columns.email')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('users.columns.role')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('users.columns.status')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('users.columns.joined')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('users.columns.registrations')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('common.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={32} />
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">{t('common.noData')}</Typography>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {user.name ?? '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{user.email}</Typography>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={user.role}
                      size="small"
                      variant="standard"
                      onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                      sx={{ fontSize: '0.75rem' }}
                    >
                      {Object.values(UserRole).map((r) => (
                        <MenuItem key={r} value={r}>{r}</MenuItem>
                      ))}
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.isActive ? t('users.active') : t('users.inactive')}
                      color={user.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {format(new Date(user.createdAt), 'dd.MM.yyyy')}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    {user._count?.registrations ?? 0}
                  </TableCell>
                  <TableCell>
                    <Tooltip title={user.isActive ? t('users.deactivate') : t('users.activate')}>
                      <Switch
                        checked={user.isActive}
                        onChange={() => handleToggleActive(user)}
                        size="small"
                      />
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
