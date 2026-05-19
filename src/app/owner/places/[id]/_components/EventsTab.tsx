'use client';

import {
  Box,
  Button,
  TextField,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
  Paper,
  Grid,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  FormControlLabel,
  Switch,
  Divider,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Badge,
} from '@mui/material';
import { Add, Edit, Delete, ContentCopy, Event as EventIcon, People } from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { useTranslation } from '@/i18n/client';

interface PricingRule {
  id: string;
  name: string;
  currency: string;
  requiresPayment: boolean;
}

interface PlaceEvent {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  eventDate: string;
  startTime: string;
  endTime: string;
  maxReservations: number | null;
  reservationDeadline: string | null;
  pricingRuleId: string | null;
  pricingRule: PricingRule | null;
  isActive: boolean;
  createdAt: string;
  _count: { registrations: number };
}

interface EventForm {
  title: string;
  description: string;
  imageUrl: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  maxReservations: string;
  reservationDeadline: string;
  pricingRuleId: string;
  isActive: boolean;
}

const EMPTY_FORM: EventForm = {
  title: '',
  description: '',
  imageUrl: '',
  eventDate: '',
  startTime: '09:00',
  endTime: '17:00',
  maxReservations: '',
  reservationDeadline: '',
  pricingRuleId: '',
  isActive: true,
};

interface Props {
  placeId: string;
}

export default function EventsTab({ placeId }: Props) {
  const { t } = useTranslation('owner');
  const [events, setEvents] = useState<PlaceEvent[]>([]);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PlaceEvent | null>(null);
  const [form, setForm] = useState<EventForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<PlaceEvent | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Embed token copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const APP_URL = typeof window !== 'undefined' ? window.location.origin : '';

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`/api/events?placeId=${placeId}`).then((r) => r.json()),
      fetch(`/api/pricing?placeId=${placeId}`).then((r) => r.json()),
    ])
      .then(([eventsData, pricingData]) => {
        setEvents(eventsData.data?.items ?? []);
        setPricingRules(pricingData.data ?? []);
      })
      .catch(() => setError(t('events.errors.loadFailed', 'Failed to load events')))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [placeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (ev: PlaceEvent) => {
    setEditing(ev);
    setForm({
      title: ev.title,
      description: ev.description ?? '',
      imageUrl: ev.imageUrl ?? '',
      eventDate: ev.eventDate.slice(0, 10),
      startTime: ev.startTime,
      endTime: ev.endTime,
      maxReservations: ev.maxReservations != null ? String(ev.maxReservations) : '',
      reservationDeadline: ev.reservationDeadline
        ? new Date(ev.reservationDeadline).toISOString().slice(0, 16)
        : '',
      pricingRuleId: ev.pricingRuleId ?? '',
      isActive: ev.isActive,
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      setFormError(t('events.errors.titleRequired', 'Title is required'));
      return;
    }
    if (!form.eventDate) {
      setFormError(t('events.errors.dateRequired', 'Event date is required'));
      return;
    }

    setSaving(true);
    setFormError(null);

    const payload = {
      placeId,
      title: form.title.trim(),
      description: form.description.trim() || null,
      imageUrl: form.imageUrl.trim() || null,
      eventDate: form.eventDate,
      startTime: form.startTime,
      endTime: form.endTime,
      maxReservations: form.maxReservations ? parseInt(form.maxReservations) : null,
      reservationDeadline: form.reservationDeadline
        ? new Date(form.reservationDeadline).toISOString()
        : null,
      pricingRuleId: form.pricingRuleId || null,
      isActive: form.isActive,
    };

    try {
      const res = editing
        ? await fetch(`/api/events/${editing.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? t('events.errors.saveFailed', 'Save failed'));
      setDialogOpen(false);
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('events.errors.saveFailed', 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/events/${deleteTarget.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? t('events.errors.deleteFailed', 'Delete failed'));
      setDeleteTarget(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('events.errors.deleteFailed', 'Delete failed'));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const copyEmbedUrl = async (ev: PlaceEvent) => {
    const url = `${APP_URL}/events/${ev.id}`;
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopiedId(ev.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isEventPast = (dateStr: string) => new Date(dateStr) < new Date();
  const isFull = (ev: PlaceEvent) =>
    ev.maxReservations != null && ev._count.registrations >= ev.maxReservations;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {t('events.title', 'Events')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('events.subtitle', 'Create and manage scheduled events guests can reserve spots for')}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
          {t('events.addNew', 'Add Event')}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {events.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
          <EventIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            {t('events.empty', 'No events yet. Add your first event to start accepting reservations.')}
          </Typography>
          <Button variant="outlined" startIcon={<Add />} onClick={openCreate}>
            {t('events.addNew', 'Add Event')}
          </Button>
        </Paper>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>{t('events.table.title', 'Title')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('events.table.date', 'Date & Time')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('events.table.reservations', 'Reservations')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('events.table.pricing', 'Pricing')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('events.table.status', 'Status')}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>{t('common.actions', 'Actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {events.map((ev) => {
              const past = isEventPast(ev.eventDate);
              const full = isFull(ev);
              return (
                <TableRow key={ev.id} sx={{ opacity: !ev.isActive ? 0.55 : 1 }}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {ev.title}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(ev.eventDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {ev.startTime} – {ev.endTime}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <People fontSize="small" color="action" />
                      <Typography variant="body2">
                        {ev._count.registrations}
                        {ev.maxReservations != null ? ` / ${ev.maxReservations}` : ''}
                      </Typography>
                      {full && !past && (
                        <Chip label={t('events.full', 'Full')} size="small" color="warning" sx={{ height: 18, fontSize: '0.68rem' }} />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {ev.pricingRule ? (
                      <Typography variant="caption" color="text.secondary">
                        {ev.pricingRule.name} ({ev.pricingRule.currency})
                      </Typography>
                    ) : (
                      <Typography variant="caption" color="text.disabled">
                        {t('events.noPricing', 'Free / No pricing')}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {past ? (
                      <Chip label={t('events.past', 'Past')} size="small" color="default" sx={{ height: 18 }} />
                    ) : ev.isActive ? (
                      <Chip label={t('events.active', 'Active')} size="small" color="success" sx={{ height: 18 }} />
                    ) : (
                      <Chip label={t('events.inactive', 'Inactive')} size="small" color="default" sx={{ height: 18 }} />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title={copiedId === ev.id ? t('events.copied', 'Copied!') : t('events.copyLink', 'Copy public link')}>
                      <IconButton size="small" onClick={() => copyEmbedUrl(ev)} color={copiedId === ev.id ? 'success' : 'default'}>
                        <ContentCopy fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('common.edit', 'Edit')}>
                      <IconButton size="small" onClick={() => openEdit(ev)}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('common.delete', 'Delete')}>
                      <IconButton size="small" color="error" onClick={() => setDeleteTarget(ev)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* ── Create / Edit dialog ─────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editing ? t('events.editTitle', 'Edit Event') : t('events.addNew', 'Add Event')}
        </DialogTitle>
        <DialogContent sx={{ pt: '12px !important' }}>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField
                label={t('events.form.title', 'Event Title')}
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                fullWidth
                autoFocus
                required
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label={t('events.form.description', 'Description')}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                fullWidth
                multiline
                rows={3}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label={t('events.form.imageUrl', 'Image URL (optional)')}
                value={form.imageUrl}
                onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                fullWidth
                placeholder="https://..."
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label={t('events.form.eventDate', 'Event Date')}
                type="date"
                value={form.eventDate}
                onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))}
                fullWidth
                required
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <TextField
                label={t('events.form.startTime', 'Start Time')}
                type="time"
                value={form.startTime}
                onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <TextField
                label={t('events.form.endTime', 'End Time')}
                type="time"
                value={form.endTime}
                onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label={t('events.form.maxReservations', 'Max Reservations')}
                type="number"
                value={form.maxReservations}
                onChange={(e) => setForm((f) => ({ ...f, maxReservations: e.target.value }))}
                fullWidth
                helperText={t('events.form.maxReservationsHint', 'Leave blank for unlimited')}
                slotProps={{ htmlInput: { min: 1 } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label={t('events.form.reservationDeadline', 'Reservation Deadline')}
                type="datetime-local"
                value={form.reservationDeadline}
                onChange={(e) => setForm((f) => ({ ...f, reservationDeadline: e.target.value }))}
                fullWidth
                helperText={t('events.form.reservationDeadlineHint', 'Close reservations at this time')}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>

            {pricingRules.length > 0 && (
              <Grid size={{ xs: 12 }}>
                <TextField
                  label={t('events.form.pricingRule', 'Pricing Rule')}
                  select
                  value={form.pricingRuleId}
                  onChange={(e) => setForm((f) => ({ ...f, pricingRuleId: e.target.value }))}
                  fullWidth
                  helperText={t('events.form.pricingRuleHint', 'Select an existing pricing rule or leave blank for free events')}
                >
                  <MenuItem value="">{t('events.form.noPrice', '— Free (no pricing) —')}</MenuItem>
                  {pricingRules.map((rule) => (
                    <MenuItem key={rule.id} value={rule.id}>
                      {rule.name} ({rule.currency})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            )}

            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 1 }} />
              <FormControlLabel
                control={
                  <Switch
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    color="success"
                  />
                }
                label={t('events.form.isActive', 'Active (visible to guests)')}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {saving ? t('common.saving', 'Saving…') : t('common.save', 'Save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete confirm dialog ────────────────────────────────────────── */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('events.deleteTitle', 'Delete Event?')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('events.deleteConfirm', 'Are you sure you want to delete "{{name}}"? This cannot be undone.', {
              name: deleteTarget?.title,
            })}
          </Typography>
          {(deleteTarget?._count.registrations ?? 0) > 0 && (
            <Alert severity="warning" sx={{ mt: 1.5 }}>
              {t('events.deleteWithReservationsWarning', 'This event has {{count}} active reservation(s). Cancel them first.', {
                count: deleteTarget?._count.registrations,
              })}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>{t('common.cancel', 'Cancel')}</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={deleting || (deleteTarget?._count.registrations ?? 0) > 0}
            startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {deleting ? t('events.deleting', 'Deleting…') : t('common.delete', 'Delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
