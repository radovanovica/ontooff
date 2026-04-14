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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Pagination,
} from '@mui/material';
import { Search, CheckCircle, Cancel, OpenInNew, DeleteForever } from '@mui/icons-material';
import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { useTranslation } from '@/i18n/client';
import PageHeader from '@/components/ui/PageHeader';

interface OrgRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  country: string | null;
  website: string | null;
  description: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  createdAt: string;
  approvedAt: string | null;
  _count?: { places: number };
}

const STATUS_COLORS: Record<string, 'warning' | 'success' | 'error' | 'default'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  SUSPENDED: 'default',
};

export default function AdminOrganizationsPage() {
  const { t } = useTranslation('admin');
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 20;

  // Action dialog
  const [actionTarget, setActionTarget] = useState<OrgRow | null>(null);
  const [actionType, setActionType] = useState<'APPROVED' | 'REJECTED' | 'SUSPENDED' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actioning, setActioning] = useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<OrgRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchOrgs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));
      const res = await fetch(`/api/admin/organizations?${params}`);
      const data = await res.json();
      setOrgs(data.data?.items ?? []);
      setTotal(data.data?.total ?? 0);
      setTotalPages(data.data?.totalPages ?? Math.ceil((data.data?.total ?? 0) / PAGE_SIZE));
    } catch {
      setError('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    const timer = setTimeout(fetchOrgs, 300);
    return () => clearTimeout(timer);
  }, [fetchOrgs]);

  const handleAction = async () => {
    if (!actionTarget || !actionType) return;
    setActioning(true);
    try {
      const res = await fetch('/api/admin/organizations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: actionTarget.id,
          status: actionType,
          reason: rejectionReason || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      setActionTarget(null);
      setActionType(null);
      setRejectionReason('');
      fetchOrgs();
    } catch {
      setError('Action failed');
    } finally {
      setActioning(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/organizations?id=${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      setDeleteTarget(null);
      fetchOrgs();
    } catch {
      setError('Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title={t('organizations.title', 'Organizations')}
        breadcrumbs={[
          { label: t('dashboard.title'), href: '/admin' },
          { label: t('organizations.title', 'Organizations') },
        ]}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder={t('organizations.searchPlaceholder', 'Search by name or email…')}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>
              ),
            },
          }}
          sx={{ minWidth: 280 }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>{t('organizations.status', 'Status')}</InputLabel>
          <Select
            value={statusFilter}
            label={t('organizations.status', 'Status')}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <MenuItem value="">{t('common.all')}</MenuItem>
            <MenuItem value="PENDING">{t('organizations.statuses.PENDING', 'Pending')}</MenuItem>
            <MenuItem value="APPROVED">{t('organizations.statuses.APPROVED', 'Approved')}</MenuItem>
            <MenuItem value="REJECTED">{t('organizations.statuses.REJECTED', 'Rejected')}</MenuItem>
            <MenuItem value="SUSPENDED">{t('organizations.statuses.SUSPENDED', 'Suspended')}</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 700 }}>{t('organizations.columns.name', 'Name')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('organizations.columns.email', 'Email')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('organizations.columns.location', 'Location')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('organizations.columns.places', 'Places')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('organizations.columns.status', 'Status')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('organizations.columns.registered', 'Registered')}</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : orgs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  {t('common.noData')}
                </TableCell>
              </TableRow>
            ) : (
              orgs.map((org) => (
                <TableRow key={org.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{org.name}</Typography>
                    {org.phone && <Typography variant="caption" color="text.secondary">{org.phone}</Typography>}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{org.email}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{[org.city, org.country].filter(Boolean).join(', ') || '—'}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">{org._count?.places ?? 0}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={t(`organizations.statuses.${org.status}`, org.status)}
                      color={STATUS_COLORS[org.status] ?? 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{format(new Date(org.createdAt), 'dd MMM yyyy')}</Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {org.website && (
                        <Tooltip title={t('organizations.actions.website', 'Website')}>
                          <IconButton size="small" component="a" href={org.website} target="_blank" rel="noopener noreferrer">
                            <OpenInNew fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {org.status === 'PENDING' && (
                        <>
                          <Tooltip title={t('organizations.actions.approve', 'Approve')}>
                            <IconButton size="small" color="success" onClick={() => { setActionTarget(org); setActionType('APPROVED'); }}>
                              <CheckCircle fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t('organizations.actions.reject', 'Reject')}>
                            <IconButton size="small" color="error" onClick={() => { setActionTarget(org); setActionType('REJECTED'); }}>
                              <Cancel fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      {org.status === 'APPROVED' && (
                        <Tooltip title={t('organizations.actions.suspend', 'Suspend')}>
                          <IconButton size="small" color="warning" onClick={() => { setActionTarget(org); setActionType('SUSPENDED'); }}>
                            <Cancel fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {(org.status === 'REJECTED' || org.status === 'SUSPENDED') && (
                        <Tooltip title={t('organizations.actions.approve', 'Approve')}>
                          <IconButton size="small" color="success" onClick={() => { setActionTarget(org); setActionType('APPROVED'); }}>
                            <CheckCircle fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title={t('organizations.actions.delete', 'Delete permanently')}>
                        <IconButton size="small" color="error" onClick={() => setDeleteTarget(org)}>
                          <DeleteForever fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 3 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
            {total} total organizations
          </Typography>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, p) => setPage(p)}
            color="primary"
            shape="rounded"
          />
        </Box>
      )}

      {/* Confirm action dialog */}
      <Dialog open={!!actionTarget} onClose={() => { setActionTarget(null); setActionType(null); setRejectionReason(''); }} maxWidth="sm" fullWidth>
        <DialogTitle>
          {actionType === 'APPROVED' && t('organizations.confirmApprove', 'Approve Organization')}
          {actionType === 'REJECTED' && t('organizations.confirmReject', 'Reject Organization')}
          {actionType === 'SUSPENDED' && t('organizations.confirmSuspend', 'Suspend Organization')}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            {actionType === 'APPROVED' && `Approve "${actionTarget?.name}"? A PLACE_OWNER account will be created and login credentials will be sent to ${actionTarget?.email}.`}
            {actionType === 'REJECTED' && `Reject "${actionTarget?.name}"? A notification email will be sent to ${actionTarget?.email}.`}
            {actionType === 'SUSPENDED' && `Suspend "${actionTarget?.name}"? Their places will remain but they will not be able to create new ones.`}
          </Typography>
          {actionType === 'REJECTED' && (
            <TextField
              label={t('organizations.rejectionReason', 'Reason (optional)')}
              fullWidth
              multiline
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setActionTarget(null); setActionType(null); setRejectionReason(''); }}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            color={actionType === 'APPROVED' ? 'success' : 'error'}
            disabled={actioning}
            onClick={handleAction}
          >
            {actioning ? <CircularProgress size={16} color="inherit" /> : t(`organizations.actions.${actionType === 'APPROVED' ? 'approve' : actionType === 'REJECTED' ? 'reject' : 'suspend'}`, 'Confirm')}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Hard delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: 'error.main' }}>Delete Organization Permanently</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 1 }}>
            Permanently delete <strong>{deleteTarget?.name}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This removes the organization record from the database completely, freeing up the email address <strong>{deleteTarget?.email}</strong> for re-registration.
            Any linked places will be kept but unlinked from this organization.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>{t('common.cancel')}</Button>
          <Button
            variant="contained"
            color="error"
            disabled={deleting}
            onClick={handleDelete}
            startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <DeleteForever />}
          >
            {deleting ? 'Deleting…' : 'Delete Permanently'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
