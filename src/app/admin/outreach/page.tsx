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
  Grid,
} from '@mui/material';
import {
  Search,
  Add,
  Edit,
  DeleteForever,
  OpenInNew,
  Instagram,
  AutoAwesome,
  ContentCopy,
  Check,
  Save,
  Refresh,
} from '@mui/icons-material';
import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { useTranslation } from '@/i18n/client';
import PageHeader from '@/components/ui/PageHeader';

type OutreachStatus = 'NEW' | 'CONTACTED' | 'INTERESTED' | 'PROPOSAL_SENT' | 'CONVERTED' | 'DECLINED' | 'ARCHIVED';
type OutreachPriority = 'LOW' | 'MEDIUM' | 'HIGH';

interface OutreachRow {
  id: string;
  businessName: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  website: string | null;
  instagramUrl: string | null;
  status: OutreachStatus;
  priority: OutreachPriority;
  source: string | null;
  notes: string | null;
  nextActionAt: string | null;
  convertedAt: string | null;
  createdAt: string;
  assignedTo: { id: string; name: string | null; email: string } | null;
  proposalText: string | null;
  proposalLanguage: string | null;
  activities: string | null;
}

const STATUS_COLORS: Record<OutreachStatus, 'default' | 'info' | 'warning' | 'success' | 'error' | 'primary' | 'secondary'> = {
  NEW: 'default',
  CONTACTED: 'info',
  INTERESTED: 'primary',
  PROPOSAL_SENT: 'warning',
  CONVERTED: 'success',
  DECLINED: 'error',
  ARCHIVED: 'default',
};

const PRIORITY_COLORS: Record<OutreachPriority, 'default' | 'warning' | 'error'> = {
  LOW: 'default',
  MEDIUM: 'warning',
  HIGH: 'error',
};

const STATUSES: OutreachStatus[] = ['NEW', 'CONTACTED', 'INTERESTED', 'PROPOSAL_SENT', 'CONVERTED', 'DECLINED', 'ARCHIVED'];
const PRIORITIES: OutreachPriority[] = ['LOW', 'MEDIUM', 'HIGH'];

const PROPOSAL_LANGUAGES = ['English', 'Serbian', 'Croatian', 'Bosnian', 'Montenegrin', 'German', 'Spanish', 'French', 'Italian'];

const EMPTY_FORM: Partial<OutreachRow> = {
  businessName: '',
  contactPerson: '',
  email: '',
  phone: '',
  city: '',
  country: '',
  website: '',
  instagramUrl: '',
  status: 'NEW',
  priority: 'MEDIUM',
  source: '',
  notes: '',
  activities: '',
  nextActionAt: null,
};

export default function AdminOutreachPage() {
  const { t } = useTranslation('admin');
  const [contacts, setContacts] = useState<OutreachRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 20;

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<OutreachRow | null>(null);
  const [form, setForm] = useState<Partial<OutreachRow>>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<OutreachRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Proposal dialog
  const [proposalOpen, setProposalOpen] = useState(false);
  const [proposalText, setProposalText] = useState('');
  const [proposalLanguage, setProposalLanguage] = useState('English');
  const [proposalLoading, setProposalLoading] = useState(false);
  const [proposalContact, setProposalContact] = useState<OutreachRow | null>(null);
  const [proposalCopied, setProposalCopied] = useState(false);
  const [proposalSaving, setProposalSaving] = useState(false);
  const [proposalSaved, setProposalSaved] = useState(false);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (priorityFilter) params.set('priority', priorityFilter);
      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));
      const res = await fetch(`/api/admin/outreach?${params}`);
      const data = await res.json();
      setContacts(data.data?.items ?? []);
      setTotal(data.data?.total ?? 0);
      setTotalPages(data.data?.totalPages ?? 1);
    } catch {
      setError(t('outreach.errors.loadFailed', 'Failed to load contacts'));
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, priorityFilter, page, t]);

  useEffect(() => {
    const timer = setTimeout(fetchContacts, 300);
    return () => clearTimeout(timer);
  }, [fetchContacts]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (row: OutreachRow) => {
    setEditing(row);
    setForm({
      businessName: row.businessName,
      contactPerson: row.contactPerson ?? '',
      email: row.email ?? '',
      phone: row.phone ?? '',
      city: row.city ?? '',
      country: row.country ?? '',
      website: row.website ?? '',
      instagramUrl: row.instagramUrl ?? '',
      status: row.status,
      priority: row.priority,
      source: row.source ?? '',
      notes: row.notes ?? '',
      activities: row.activities ?? '',
      nextActionAt: row.nextActionAt ? row.nextActionAt.slice(0, 10) : '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.businessName?.trim()) return;
    setSaving(true);
    try {
      const url = '/api/admin/outreach';
      const method = editing ? 'PATCH' : 'POST';
      const body = editing ? { ...form, id: editing.id } : form;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed');
      setDialogOpen(false);
      fetchContacts();
    } catch {
      setError(t('outreach.errors.saveFailed', 'Failed to save contact'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/outreach?id=${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      setDeleteTarget(null);
      fetchContacts();
    } catch {
      setError(t('outreach.errors.deleteFailed', 'Failed to delete contact'));
    } finally {
      setDeleting(false);
    }
  };

  const setField = (key: keyof typeof EMPTY_FORM, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const openProposalDialog = (row: OutreachRow) => {
    setProposalContact(row);
    setProposalText(row.proposalText ?? '');
    setProposalLanguage(row.proposalLanguage ?? 'English');
    setProposalCopied(false);
    setProposalSaved(false);
    setProposalLoading(false);
    setProposalOpen(true);
  };

  const runGeneration = async (contact: OutreachRow | null, language: string) => {
    if (!contact) return;
    setProposalText('');
    setProposalSaved(false);
    setProposalLoading(true);
    try {
      const res = await fetch('/api/admin/outreach/proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: contact.businessName,
          contactPerson: contact.contactPerson,
          city: contact.city,
          country: contact.country,
          website: contact.website,
          instagramUrl: contact.instagramUrl,
          notes: contact.notes,
          activities: contact.activities,
          language,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to generate proposal.' }));
        setProposalText(err.error ?? 'Failed to generate proposal.');
        return;
      }
      const reader = res.body?.getReader();
      if (!reader) { setProposalText('No response received.'); return; }
      const decoder = new TextDecoder();
      let accumulated = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setProposalText(accumulated);
      }
    } catch {
      setProposalText('Failed to generate proposal. Please try again.');
    } finally {
      setProposalLoading(false);
    }
  };

  const saveProposal = async () => {
    if (!proposalContact || !proposalText.trim() || proposalSaving) return;
    setProposalSaving(true);
    try {
      const res = await fetch('/api/admin/outreach/proposal', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: proposalContact.id, proposalText: proposalText.trim(), proposalLanguage }),
      });
      if (!res.ok) throw new Error('Failed');
      setProposalSaved(true);
      setTimeout(() => setProposalSaved(false), 2500);
      setContacts((prev) => prev.map((c) =>
        c.id === proposalContact.id ? { ...c, proposalText: proposalText.trim(), proposalLanguage } : c
      ));
      setProposalContact((prev) => prev ? { ...prev, proposalText: proposalText.trim(), proposalLanguage } : prev);
    } catch {
      setError(t('outreach.errors.saveFailed', 'Failed to save proposal.'));
    } finally {
      setProposalSaving(false);
    }
  };

  const copyProposal = () => {
    navigator.clipboard.writeText(proposalText).then(() => {
      setProposalCopied(true);
      setTimeout(() => setProposalCopied(false), 2000);
    });
  };

  return (
    <Box>
      <PageHeader
        title={t('outreach.title', 'Outreach / CRM')}
        breadcrumbs={[
          { label: t('dashboard.title'), href: '/admin' },
          { label: t('outreach.title', 'Outreach / CRM') },
        ]}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Filters + Add */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder={t('outreach.searchPlaceholder', 'Search by name, email or city…')}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> } }}
          sx={{ minWidth: 260 }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>{t('outreach.status', 'Status')}</InputLabel>
          <Select value={statusFilter} label={t('outreach.status', 'Status')} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <MenuItem value="">{t('common.all')}</MenuItem>
            {STATUSES.map((s) => (
              <MenuItem key={s} value={s}>{t(`outreach.statuses.${s}`, s)}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>{t('outreach.priority', 'Priority')}</InputLabel>
          <Select value={priorityFilter} label={t('outreach.priority', 'Priority')} onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}>
            <MenuItem value="">{t('common.all')}</MenuItem>
            {PRIORITIES.map((p) => (
              <MenuItem key={p} value={p}>{t(`outreach.priorities.${p}`, p)}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box sx={{ ml: 'auto' }}>
          <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
            {t('outreach.addNew', 'Add Contact')}
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 700 }}>{t('outreach.columns.business', 'Business')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('outreach.columns.contact', 'Contact')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('outreach.columns.location', 'Location')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('outreach.columns.status', 'Status')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('outreach.columns.priority', 'Priority')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('outreach.columns.nextAction', 'Next Action')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('outreach.columns.notes', 'Notes')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('outreach.columns.assignedTo', 'Assigned To')}</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : contacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  {t('common.noData')}
                </TableCell>
              </TableRow>
            ) : (
              contacts.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.businessName}</Typography>
                    {row.website && (
                      <Tooltip title={row.website}>
                        <IconButton size="small" component="a" href={row.website} target="_blank" rel="noopener noreferrer" sx={{ p: 0, ml: 0.5 }}>
                          <OpenInNew sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                    {row.instagramUrl && (
                      <Tooltip title={row.instagramUrl}>
                        <IconButton size="small" component="a" href={row.instagramUrl} target="_blank" rel="noopener noreferrer" sx={{ p: 0, ml: 0.5, color: '#E1306C' }}>
                          <Instagram sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{row.contactPerson || '—'}</Typography>
                    {row.email && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{row.email}</Typography>}
                    {row.phone && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{row.phone}</Typography>}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{[row.city, row.country].filter(Boolean).join(', ') || '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={t(`outreach.statuses.${row.status}`, row.status)}
                      color={STATUS_COLORS[row.status]}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={t(`outreach.priorities.${row.priority}`, row.priority)}
                      color={PRIORITY_COLORS[row.priority as OutreachPriority] ?? 'default'}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {row.nextActionAt ? format(new Date(row.nextActionAt), 'dd MMM yyyy') : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 200 }}>
                    {row.notes ? (
                      <Tooltip title={row.notes} placement="top">
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            cursor: 'default',
                          }}
                        >
                          {row.notes}
                        </Typography>
                      </Tooltip>
                    ) : (
                      <Typography variant="caption" color="text.disabled">—</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{row.assignedTo?.name || '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title={row.proposalText ? t('outreach.viewProposal', 'View / Edit Proposal') : t('outreach.generateProposal', 'Generate Proposal')}>
                        <IconButton size="small" color={row.proposalText ? 'success' : 'primary'} onClick={() => openProposalDialog(row)}>
                          <AutoAwesome fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('common.edit', 'Edit')}>
                        <IconButton size="small" onClick={() => openEdit(row)}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('common.delete', 'Delete')}>
                        <IconButton size="small" color="error" onClick={() => setDeleteTarget(row)}>
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

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 3 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
            {t('outreach.totalCount', { count: total, defaultValue: `${total} contacts` })}
          </Typography>
          <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} color="primary" shape="rounded" />
        </Box>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editing ? t('outreach.editTitle', 'Edit Contact') : t('outreach.addNew', 'Add Contact')}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label={t('outreach.fields.businessName', 'Business Name')}
                fullWidth size="small" required
                value={form.businessName ?? ''}
                onChange={(e) => setField('businessName', e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label={t('outreach.fields.contactPerson', 'Contact Person')}
                fullWidth size="small"
                value={form.contactPerson ?? ''}
                onChange={(e) => setField('contactPerson', e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label={t('outreach.fields.email', 'Email')}
                fullWidth size="small" type="email"
                value={form.email ?? ''}
                onChange={(e) => setField('email', e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label={t('outreach.fields.phone', 'Phone')}
                fullWidth size="small"
                value={form.phone ?? ''}
                onChange={(e) => setField('phone', e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label={t('outreach.fields.city', 'City')}
                fullWidth size="small"
                value={form.city ?? ''}
                onChange={(e) => setField('city', e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label={t('outreach.fields.country', 'Country')}
                fullWidth size="small"
                value={form.country ?? ''}
                onChange={(e) => setField('country', e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label={t('outreach.fields.website', 'Website')}
                fullWidth size="small"
                value={form.website ?? ''}
                onChange={(e) => setField('website', e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label={t('outreach.fields.instagramUrl', 'Instagram URL')}
                fullWidth size="small"
                value={form.instagramUrl ?? ''}
                onChange={(e) => setField('instagramUrl', e.target.value)}
                placeholder="https://instagram.com/..."
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>{t('outreach.status', 'Status')}</InputLabel>
                <Select
                  value={form.status ?? 'NEW'}
                  label={t('outreach.status', 'Status')}
                  onChange={(e) => setField('status', e.target.value)}
                >
                  {STATUSES.map((s) => (
                    <MenuItem key={s} value={s}>{t(`outreach.statuses.${s}`, s)}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>{t('outreach.priority', 'Priority')}</InputLabel>
                <Select
                  value={form.priority ?? 'MEDIUM'}
                  label={t('outreach.priority', 'Priority')}
                  onChange={(e) => setField('priority', e.target.value)}
                >
                  {PRIORITIES.map((p) => (
                    <MenuItem key={p} value={p}>{t(`outreach.priorities.${p}`, p)}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label={t('outreach.fields.source', 'Source')}
                fullWidth size="small"
                value={form.source ?? ''}
                onChange={(e) => setField('source', e.target.value)}
                placeholder="REFERRAL, INBOUND, COLD_OUTREACH…"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label={t('outreach.fields.nextActionAt', 'Next Action Date')}
                fullWidth size="small" type="date"
                value={form.nextActionAt ? String(form.nextActionAt).slice(0, 10) : ''}
                onChange={(e) => setField('nextActionAt', e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label={t('outreach.fields.notes', 'Notes')}
                fullWidth size="small" multiline rows={3}
                value={form.notes ?? ''}
                onChange={(e) => setField('notes', e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label={t('outreach.fields.activities', 'Activities Offered')}
                fullWidth size="small"
                value={form.activities ?? ''}
                onChange={(e) => setField('activities', e.target.value)}
                placeholder="e.g. camping, fishing, kayaking, hiking…"
                helperText={t('outreach.fields.activitiesHelper', 'Used to personalise AI proposals')}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button
            variant="contained"
            disabled={saving || !form.businessName?.trim()}
            onClick={handleSave}
          >
            {saving ? <CircularProgress size={16} color="inherit" /> : t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Proposal dialog */}
      <Dialog open={proposalOpen} onClose={() => setProposalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesome sx={{ color: 'primary.main', fontSize: 20 }} />
          {t('outreach.proposalTitle', 'AI Proposal')} — {proposalContact?.businessName}
        </DialogTitle>
        <DialogContent>
          {/* Language + action row */}
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 2, mt: 0.5, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>{t('outreach.proposalLanguage', 'Language')}</InputLabel>
              <Select
                value={proposalLanguage}
                label={t('outreach.proposalLanguage', 'Language')}
                onChange={(e) => setProposalLanguage(e.target.value)}
                disabled={proposalLoading}
              >
                {PROPOSAL_LANGUAGES.map((lang) => (
                  <MenuItem key={lang} value={lang}>{lang}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              size="small"
              startIcon={proposalLoading
                ? <CircularProgress size={14} color="inherit" />
                : proposalText ? <Refresh /> : <AutoAwesome />}
              onClick={() => runGeneration(proposalContact, proposalLanguage)}
              disabled={proposalLoading}
            >
              {proposalText
                ? t('outreach.regenerate', 'Regenerate')
                : t('outreach.generate', 'Generate')}
            </Button>
          </Box>

          {/* Spinner before first chunk */}
          {proposalLoading && proposalText === '' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <Typography variant="body2" color="text.secondary">{t('outreach.generatingProposal', 'Generating proposal…')}</Typography>
            </Box>
          )}

          {/* Editable textarea */}
          {proposalText !== '' && (
            <TextField
              multiline
              fullWidth
              minRows={10}
              value={proposalText}
              onChange={(e) => { setProposalText(e.target.value); setProposalSaved(false); }}
              variant="outlined"
              size="small"
              disabled={proposalLoading}
              slotProps={{ input: { sx: { fontFamily: 'inherit', fontSize: '0.85rem', lineHeight: 1.6 } } }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProposalOpen(false)}>{t('common.close', 'Close')}</Button>
          {proposalText && !proposalLoading && (
            <>
              <Button
                variant="outlined"
                startIcon={proposalCopied ? <Check /> : <ContentCopy />}
                onClick={copyProposal}
                color={proposalCopied ? 'success' : 'primary'}
              >
                {proposalCopied ? t('common.copied', 'Copied!') : t('common.copy', 'Copy')}
              </Button>
              <Button
                variant="contained"
                startIcon={proposalSaved ? <Check /> : proposalSaving ? undefined : <Save />}
                onClick={saveProposal}
                disabled={proposalSaving || proposalSaved}
                color={proposalSaved ? 'success' : 'primary'}
              >
                {proposalSaving
                  ? <CircularProgress size={16} color="inherit" />
                  : proposalSaved
                  ? t('common.saved', 'Saved!')
                  : t('common.save')}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: 'error.main' }}>{t('outreach.deleteTitle', 'Delete Contact')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('outreach.deleteConfirm', { name: deleteTarget?.businessName, defaultValue: `Delete "${deleteTarget?.businessName}"? This cannot be undone.` })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>{t('common.cancel')}</Button>
          <Button variant="contained" color="error" disabled={deleting} onClick={handleDelete}
            startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <DeleteForever />}>
            {t('common.delete', 'Delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
