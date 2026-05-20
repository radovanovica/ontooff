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
import { Add, Edit, Delete, ContentCopy, Event as EventIcon, People, CloudUpload } from '@mui/icons-material';
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from '@/i18n/client';
import { uploadFileToS3 } from '@/lib/upload';

interface PricingRule {
  id: string;
  name: string;
  currency: string;
  requiresPayment: boolean;
}

interface EventPricingRuleItem {
  id: string;
  pricingRule: PricingRule;
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
  eventPricingRules: EventPricingRuleItem[];
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
  pricingRuleIds: string[]; // multiple pricing rules
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
  pricingRuleIds: [],
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
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      pricingRuleIds: ev.eventPricingRules.length > 0
        ? ev.eventPricingRules.map((r) => r.pricingRule.id)
        : (ev.pricingRuleId ? [ev.pricingRuleId] : []),
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
    if (!form.startTime) {
      setFormError(t('events.errors.startTimeRequired', 'Start time is required'));
      return;
    }
    if (!form.endTime) {
      setFormError(t('events.errors.endTimeRequired', 'End time is required'));
      return;
    }
    if (form.endTime <= form.startTime) {
      setFormError(t('events.errors.endTimeBeforeStart', 'End time must be after start time'));
      return;
    }
    // Warn if date is in the past (only for new events)
    if (!editing) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(form.eventDate) < today) {
        setFormError(t('events.errors.datePast', 'Event date cannot be in the past'));
        return;
      }
    }
    // Reservation deadline must be before the event starts
    if (form.reservationDeadline && form.eventDate && form.startTime) {
      const deadline = new Date(form.reservationDeadline);
      const eventStart = new Date(`${form.eventDate}T${form.startTime}`);
      if (deadline >= eventStart) {
        setFormError(t('events.errors.deadlineAfterEvent', 'Reservation deadline must be before the event starts'));
        return;
      }
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
      pricingRuleIds: form.pricingRuleIds,
      pricingRuleId: form.pricingRuleIds[0] ?? null, // legacy compat
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setFormError(null);
    try {
      const url = await uploadFileToS3(file, 'events');
      setForm((f) => ({ ...f, imageUrl: url }));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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
                    {ev.eventPricingRules.length > 0 ? (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {ev.eventPricingRules.map((r) => (
                          <Chip
                            key={r.id}
                            label={`${r.pricingRule.name} (${r.pricingRule.currency})`}
                            size="small"
                            sx={{ height: 18, fontSize: '0.68rem' }}
                          />
                        ))}
                      </Box>
                    ) : ev.pricingRule ? (
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
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleImageUpload}
              />
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <TextField
                  label={t('events.form.imageUrl', 'Image URL (optional)')}
                  value={form.imageUrl}
                  onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                  fullWidth
                  placeholder="https://..."
                />
                <Tooltip title={t('events.form.uploadImage', 'Upload image')}>
                  <span>
                    <IconButton
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading || saving}
                      color="primary"
                      sx={{ mt: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                    >
                      {uploading ? <CircularProgress size={20} /> : <CloudUpload />}
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
              {form.imageUrl && (
                <Box sx={{ mt: 1 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.imageUrl}
                    alt="preview"
                    style={{ maxHeight: 80, maxWidth: '100%', borderRadius: 4, objectFit: 'cover' }}
                  />
                </Box>
              )}
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
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  {t('events.form.pricingRules', 'Pricing Options')}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  {t('events.form.pricingRulesHint', 'Select one or more pricing options. Guests will choose one when booking.')}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {pricingRules.map((rule) => {
                    const selected = form.pricingRuleIds.includes(rule.id);
                    return (
                      <Chip
                        key={rule.id}
                        label={`${rule.name} (${rule.currency})`}
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            pricingRuleIds: selected
                              ? f.pricingRuleIds.filter((id) => id !== rule.id)
                              : [...f.pricingRuleIds, rule.id],
                          }))
                        }
                        onDelete={selected ? () =>
                          setForm((f) => ({ ...f, pricingRuleIds: f.pricingRuleIds.filter((id) => id !== rule.id) }))
                          : undefined}
                        color={selected ? 'primary' : 'default'}
                        variant={selected ? 'filled' : 'outlined'}
                        sx={{ cursor: 'pointer' }}
                      />
                    );
                  })}
                </Box>
                {form.pricingRuleIds.length === 0 && (
                  <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
                    {t('events.form.noPrice', 'No pricing selected — event will be free')}
                  </Typography>
                )}
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
