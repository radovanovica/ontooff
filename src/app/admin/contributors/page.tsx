'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Box, Button, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Typography, Chip, CircularProgress, Alert, IconButton, Tooltip, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, InputAdornment, Pagination,
  Autocomplete,
} from '@mui/material';
import { Search, Add, Close, PersonAdd } from '@mui/icons-material';
import { format } from 'date-fns';
import PageHeader from '@/components/ui/PageHeader';
import { useTranslation } from '@/i18n/client';

interface PlaceAccess {
  place: { id: string; name: string; city: string | null };
}
interface ContributorRow {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  isActive: boolean;
  createdAt: string;
  placeAccess: PlaceAccess[];
  _count: { blogPosts: number };
}
interface PlaceOption { id: string; name: string; city: string | null }
interface UserOption { id: string; name: string | null; email: string; role: string; }

export default function AdminContributorsPage() {
  const { t } = useTranslation('blog');
  const [contributors, setContributors] = useState<ContributorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Grant access dialog
  const [grantTarget, setGrantTarget] = useState<ContributorRow | null>(null);
  const [allPlaces, setAllPlaces] = useState<PlaceOption[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceOption | null>(null);
  const [granting, setGranting] = useState(false);

  // Promote user to contributor dialog
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoteSearch, setPromoteSearch] = useState('');
  const [promoteUsers, setPromoteUsers] = useState<UserOption[]>([]);
  const [promoteSelected, setPromoteSelected] = useState<UserOption | null>(null);
  const [promoting, setPromoting] = useState(false);

  // Create new contributor dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const PAGE_SIZE = 20;

  const fetchContributors = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), pageSize: String(PAGE_SIZE) });
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/contributors?${params}`);
      const data = await res.json();
      setContributors(data.data ?? []);
      setTotal(data.meta?.total ?? 0);
      setTotalPages(data.meta?.totalPages ?? 1);
    } catch {
      setError(t('admin.contributorsLoadFailed'));
    } finally {
      setLoading(false);
    }
  }, [search, t]);

  useEffect(() => {
    const t = setTimeout(() => fetchContributors(1), 300);
    return () => clearTimeout(t);
  }, [fetchContributors]);

  const openGrant = async (contributor: ContributorRow) => {
    setGrantTarget(contributor);
    if (allPlaces.length === 0) {
      const res = await fetch('/api/contributor/places'); // admin sees all places
      const data = await res.json();
      setAllPlaces(data.data ?? []);
    }
  };

  const handleGrant = async () => {
    if (!grantTarget || !selectedPlace) return;
    setGranting(true);
    try {
      await fetch(`/api/admin/contributors?contributorId=${grantTarget.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId: selectedPlace.id }),
      });
      setGrantTarget(null);
      setSelectedPlace(null);
      fetchContributors(page);
    } catch {
      setError('Failed to grant access');
    } finally {
      setGranting(false);
    }
  };

  const handleRevoke = async (contributorId: string, placeId: string) => {
    if (!confirm(t('admin.revokeConfirm'))) return;
    await fetch(`/api/admin/contributors/${contributorId}/places/${placeId}`, { method: 'DELETE' });
    fetchContributors(page);
  };

  const searchPromoteUsers = useCallback(async (q: string) => {
    if (!q.trim()) { setPromoteUsers([]); return; }
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(q)}&pageSize=15`);
      const data = await res.json();
      const items: UserOption[] = data.data?.items ?? data.items ?? [];
      setPromoteUsers(items.filter((u) => u.role !== 'SUPER_ADMIN' && u.role !== 'CONTRIBUTOR'));
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchPromoteUsers(promoteSearch), 300);
    return () => clearTimeout(t);
  }, [promoteSearch, searchPromoteUsers]);

  const handlePromote = async () => {
    if (!promoteSelected) return;
    setPromoting(true);
    try {
      await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: promoteSelected.id, role: 'CONTRIBUTOR' }),
      });
      setPromoteOpen(false);
      setPromoteSelected(null);
      setPromoteSearch('');
      fetchContributors(1);
    } catch {
      setError(t('admin.contributorsLoadFailed'));
    } finally {
      setPromoting(false);
    }
  };

  const handleCreateContributor = async () => {
    if (!createName.trim() || !createEmail.trim() || !createPassword) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: createName.trim(), email: createEmail.trim(), password: createPassword, role: 'CONTRIBUTOR' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error ?? t('admin.createDialog.create'));
        return;
      }
      setCreateOpen(false);
      setCreateName('');
      setCreateEmail('');
      setCreatePassword('');
      fetchContributors(1);
    } catch {
      setCreateError(t('admin.createDialog.create'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title={t('admin.contributorsTitle')}
        subtitle={t('admin.contributorsSubtitle')}
        breadcrumbs={[{ label: t('admin.breadcrumbAdmin'), href: '/admin' }, { label: t('admin.contributorsTitle') }]}
      />

      <Box sx={{ display: 'flex', gap: 2, mb: 3, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder={t('admin.searchContributors')}
          size="small"
          sx={{ minWidth: 240 }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> } }}
        />
        <Button
          variant="contained"
          startIcon={<PersonAdd />}
          onClick={() => setPromoteOpen(true)}
        >
          {t('admin.addContributor')}
        </Button>
        <Button
          variant="outlined"
          startIcon={<Add />}
          onClick={() => { setCreateError(null); setCreateOpen(true); }}
        >
          {t('admin.createNew')}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 700 }}>{t('admin.tableContributor')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('admin.tablePosts')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('admin.placeAccess')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('admin.tableSince')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('admin.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={32} />
                </TableCell>
              </TableRow>
            ) : contributors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">{t('admin.noContributors')}</Typography>
                </TableCell>
              </TableRow>
            ) : (
              contributors.map((c) => (
                <TableRow key={c.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar src={c.image ?? undefined} sx={{ width: 32, height: 32 }}>
                        {c.name?.charAt(0) ?? c.email.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{c.name ?? '—'}</Typography>
                        <Typography variant="caption" color="text.secondary">{c.email}</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{c._count.blogPosts}</Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {c.placeAccess.length === 0 ? (
                        <Typography variant="caption" color="text.secondary">{t('admin.noPlaces')}</Typography>
                      ) : (
                        c.placeAccess.map((a) => (
                          <Chip
                            key={a.place.id}
                            label={a.place.name}
                            size="small"
                            onDelete={() => handleRevoke(c.id, a.place.id)}
                          />
                        ))
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {format(new Date(c.createdAt), 'dd MMM yyyy')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Tooltip title={t('admin.tooltipGrantAccess')}>
                      <IconButton size="small" color="primary" onClick={() => openGrant(c)}>
                        <Add fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 3, gap: 1 }}>
          <Typography variant="caption" color="text.secondary">{t('admin.totalContributors', { count: total })}</Typography>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, p) => { setPage(p); fetchContributors(p); }}
            color="primary"
            shape="rounded"
          />
        </Box>
      )}

      {/* Grant Place Access Dialog */}
      <Dialog open={!!grantTarget} onClose={() => setGrantTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {t('admin.grantDialog.title')}
          <IconButton onClick={() => setGrantTarget(null)} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {t('admin.grantDialog.body', { name: grantTarget?.name ?? grantTarget?.email })}
          </Typography>
          <Autocomplete
            options={allPlaces.filter(
              (p) => !grantTarget?.placeAccess.some((a) => a.place.id === p.id)
            )}
            getOptionLabel={(o) => `${o.name}${o.city ? ` — ${o.city}` : ''}`}
            value={selectedPlace}
            onChange={(_, val) => setSelectedPlace(val)}
            renderInput={(params) => (
              <TextField {...params} size="small" label={t('admin.grantDialog.selectPlaceLabel')} fullWidth />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGrantTarget(null)}>{t('admin.grantDialog.cancel')}</Button>
          <Button
            variant="contained"
            onClick={handleGrant}
            disabled={granting || !selectedPlace}
            startIcon={granting ? <CircularProgress size={16} color="inherit" /> : <PersonAdd />}
          >
            {t('admin.grantDialog.grant')}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Create New Contributor Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {t('admin.createDialog.title')}
          <IconButton onClick={() => setCreateOpen(false)} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('admin.createDialog.body')}
          </Typography>
          {createError && <Alert severity="error" sx={{ mb: 2 }}>{createError}</Alert>}
          <TextField
            label={t('admin.createDialog.nameLabel')}
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            fullWidth
            required
            size="small"
            sx={{ mb: 2 }}
          />
          <TextField
            label={t('admin.createDialog.emailLabel')}
            type="email"
            value={createEmail}
            onChange={(e) => setCreateEmail(e.target.value)}
            fullWidth
            required
            size="small"
            sx={{ mb: 2 }}
          />
          <TextField
            label={t('admin.createDialog.passwordLabel')}
            type="password"
            value={createPassword}
            onChange={(e) => setCreatePassword(e.target.value)}
            fullWidth
            required
            size="small"
            helperText={t('admin.createDialog.passwordHint')}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>{t('admin.createDialog.cancel')}</Button>
          <Button
            variant="contained"
            onClick={handleCreateContributor}
            disabled={creating || !createName.trim() || !createEmail.trim() || createPassword.length < 8}
            startIcon={creating ? <CircularProgress size={16} color="inherit" /> : <PersonAdd />}
          >
            {t('admin.createDialog.create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Contributor Dialog */}
      <Dialog open={promoteOpen} onClose={() => { setPromoteOpen(false); setPromoteSelected(null); setPromoteSearch(''); }} maxWidth="sm" fullWidth>
        <DialogTitle>
          {t('admin.promoteDialog.title')}
          <IconButton onClick={() => { setPromoteOpen(false); setPromoteSelected(null); setPromoteSearch(''); }} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('admin.promoteDialog.body')}
          </Typography>
          <Autocomplete<UserOption>
            options={promoteUsers}
            getOptionLabel={(o) => `${o.name ?? o.email} (${o.email})`}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            value={promoteSelected}
            onChange={(_, val) => setPromoteSelected(val)}
            inputValue={promoteSearch}
            onInputChange={(_, val) => setPromoteSearch(val)}
            filterOptions={(x) => x}
            noOptionsText={promoteSearch.length < 2 ? t('admin.promoteDialog.typeToSearch') : t('admin.promoteDialog.noMatchingUsers')}
            renderInput={(params) => (
              <TextField {...params} label={t('admin.promoteDialog.searchUsers')} size="small" fullWidth placeholder={t('admin.promoteDialog.searchPlaceholder')} />
            )}
            renderOption={(props, o) => (
              <Box component="li" {...props} key={o.id}>
                <Avatar sx={{ width: 28, height: 28, mr: 1.5, fontSize: '0.7rem', bgcolor: '#2d5a27' }}>
                  {o.name?.charAt(0) ?? o.email.charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{o.name ?? '—'}</Typography>
                  <Typography variant="caption" color="text.secondary">{o.email} · {o.role}</Typography>
                </Box>
              </Box>
            )}
          />
          {promoteSelected && (
            <Box sx={{ mt: 2, p: 1.5, bgcolor: 'info.50', borderRadius: 1, border: '1px solid', borderColor: 'info.200' }}>
              <Typography variant="body2">
                {t('admin.promoteDialog.willBePromoted', { name: promoteSelected.name ?? promoteSelected.email, from: promoteSelected.role })}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setPromoteOpen(false); setPromoteSelected(null); setPromoteSearch(''); }}>{t('admin.promoteDialog.cancel')}</Button>
          <Button
            variant="contained"
            onClick={handlePromote}
            disabled={promoting || !promoteSelected}
            startIcon={promoting ? <CircularProgress size={16} color="inherit" /> : <PersonAdd />}
          >
            {t('admin.promoteDialog.makeContributor')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
