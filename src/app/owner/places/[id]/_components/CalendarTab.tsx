'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/i18n/client';
import dynamic from 'next/dynamic';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  List,
  ListItem,
  ListItemText,
  FormControlLabel,
  Switch,
  Stack,
  Tooltip,
} from '@mui/material';
import {
  Add,
  Delete,
  Block,
  Repeat,
  EventBusy,
  OpenInNew,
} from '@mui/icons-material';
import { format, addDays } from 'date-fns';

// Dynamically import FullCalendar to avoid SSR issues
const FullCalendarView = dynamic(() => import('./FullCalendarView'), {
  ssr: false,
  loading: () => (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
      <CircularProgress />
    </Box>
  ),
});

// ─── Types ───────────────────────────────────────────────────────────────────

interface BookingRow {
  id: string;
  registrationNumber: string;
  firstName: string;
  lastName: string;
  status: string;
  startDate: string;
  endDate: string;
  activityType?: { name: string; icon?: string | null } | null;
  activityLocation?: { name: string } | null;
}

interface ClosedDateEntry {
  id: string;
  date: string | null;
  dayOfWeek: number | null;
  isRecurring: boolean;
  reason: string | null;
  activityLocationId: string | null;
  activityLocation: { id: string; name: string } | null;
}

interface LocationOption {
  id: string;
  name: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#f57c00',
  CONFIRMED: '#388e3c',
  CANCELLED: '#9e9e9e',
  COMPLETED: '#1565c0',
  NO_SHOW: '#c62828',
};

// ─── CalendarTab ─────────────────────────────────────────────────────────────

export default function CalendarTab({ placeId }: { placeId: string }) {
  const router = useRouter();
  const { t } = useTranslation('owner');
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [closedDates, setClosedDates] = useState<ClosedDateEntry[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add closed date dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState<number>(1);
  const [closedDate, setClosedDate] = useState('');
  const [closedReason, setClosedReason] = useState('');
  const [closedLocationId, setClosedLocationId] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ─── Load data ─────────────────────────────────────────────────────────────

  const loadData = async () => {
    setLoading(true);
    try {
      const [regRes, cdRes, locRes] = await Promise.all([
        fetch(`/api/registrations?placeId=${placeId}&pageSize=500`),
        fetch(`/api/places/${placeId}/closed-dates`),
        fetch(`/api/activity-locations?placeId=${placeId}`),
      ]);
      const [regData, cdData, locData] = await Promise.all([
        regRes.json(),
        cdRes.json(),
        locRes.json(),
      ]);
      setBookings(regData.data?.items ?? regData.items ?? []);
      setClosedDates(cdData.data ?? []);
      setLocations(locData.data ?? []);
    } catch {
      setError(t('calendar.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [placeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Map to FullCalendar events ────────────────────────────────────────────

  const bookingEvents = useMemo(() =>
    bookings.map((b) => ({
      id: b.id,
      title: `${b.activityType?.icon ?? ''} ${b.firstName} ${b.lastName}`.trim(),
      start: b.startDate.slice(0, 10),
      // FullCalendar end is exclusive — add 1 day so multi-day events fill correctly
      end: format(addDays(new Date(b.endDate), 1), 'yyyy-MM-dd'),
      color: STATUS_COLORS[b.status] ?? '#757575',
      extendedProps: {
        bookingId: b.id,
        status: b.status,
        registrationNumber: b.registrationNumber,
        activityType: b.activityType?.name ?? null,
        activityLocation: b.activityLocation?.name ?? null,
      },
    })),
    [bookings]
  );

  const closedDateEvents = useMemo(() =>
    closedDates
      .map((cd) => {
        if (cd.isRecurring && cd.dayOfWeek != null) {
          return {
            id: `closed-${cd.id}`,
            daysOfWeek: [cd.dayOfWeek],
            display: 'background' as const,
            backgroundColor: '#fce4ec',
            startRecur: '2020-01-01',
            endRecur: '2099-12-31',
          };
        }
        if (cd.date) {
          const dateStr = cd.date.slice(0, 10);
          return {
            id: `closed-${cd.id}`,
            start: dateStr,
            end: format(addDays(new Date(dateStr), 1), 'yyyy-MM-dd'),
            allDay: true,
            display: 'background' as const,
            backgroundColor: '#fce4ec',
          };
        }
        return null;
      })
      .filter(Boolean),
    [closedDates]
  );

  // ─── Dialog helpers ────────────────────────────────────────────────────────

  const openDialog = (dateStr?: string) => {
    setIsRecurring(false);
    setClosedDate(dateStr ?? '');
    setClosedReason('');
    setClosedLocationId('');
    setDayOfWeek(1);
    setSaveError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaveError(null);
    if (!isRecurring && !closedDate) {
      setSaveError(t('calendar.dialog.selectDateError'));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/places/${placeId}/closed-dates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityLocationId: closedLocationId || null,
          date: !isRecurring ? closedDate : null,
          dayOfWeek: isRecurring ? dayOfWeek : null,
          isRecurring,
          reason: closedReason || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t('calendar.dialog.saveFailed'));
      setClosedDates((prev) => [...prev, data.data]);
      setDialogOpen(false);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : t('calendar.dialog.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/places/${placeId}/closed-dates/${id}`, { method: 'DELETE' });
    if (res.ok) setClosedDates((prev) => prev.filter((cd) => cd.id !== id));
  };

  const handleEventClick = (bookingId: string) => {
    router.push(`/owner/bookings/${bookingId}`);
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>;
  }

  const placeWideClosed = closedDates.filter((cd) => !cd.activityLocationId);
  const locationClosed = closedDates.filter((cd) => !!cd.activityLocationId);

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 3,
        flexDirection: { xs: 'column', lg: 'row' },
        alignItems: 'flex-start',
      }}
    >
      {/* ─── Calendar ──────────────────────────────────────────────────────── */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Paper
          elevation={0}
          sx={{ p: { xs: 1.5, md: 2.5 }, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
        >
          <FullCalendarView
            events={([...bookingEvents, ...closedDateEvents] as Array<object | null>).filter((e): e is object => e !== null)}
            onDateClick={(dateStr) => openDialog(dateStr)}
            onEventClick={handleEventClick}
          />
        </Paper>

        {/* Status legend */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1.5 }}>
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <Chip
              key={status}
              label={status}
              size="small"
              sx={{ bgcolor: color, color: '#fff', fontWeight: 600, fontSize: '0.68rem', height: 20 }}
            />
          ))}
          <Chip
            label={t('calendar.legend.closed')}
            size="small"
            sx={{
              bgcolor: '#fce4ec',
              color: '#c62828',
              fontWeight: 600,
              fontSize: '0.68rem',
              height: 20,
              border: '1px solid #f48fb1',
            }}
          />
        </Box>
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
          {t('calendar.hint')}
        </Typography>
      </Box>

      {/* ─── Closed Dates Panel ────────────────────────────────────────────── */}
      <Box sx={{ width: { xs: '100%', lg: 290 }, flexShrink: 0 }}>
        <Paper
          elevation={0}
          sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
        >
          {/* Header */}
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EventBusy sx={{ color: '#c62828', fontSize: 20 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {t('calendar.closedDays.title')}
              </Typography>
            </Box>
            <Button
              size="small"
              variant="contained"
              startIcon={<Add />}
              onClick={() => openDialog()}
              sx={{ bgcolor: '#c62828', '&:hover': { bgcolor: '#b71c1c' }, minWidth: 0 }}
            >
              {t('calendar.closedDays.add')}
            </Button>
          </Box>

          {closedDates.length === 0 ? (
            <Box
              sx={{
                textAlign: 'center',
                py: 4,
                px: 1,
                bgcolor: 'grey.50',
                borderRadius: 1.5,
                border: '1px dashed',
                borderColor: 'divider',
              }}
            >
              <Block sx={{ color: 'text.disabled', fontSize: 32, mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                {t('calendar.closedDays.empty')}
              </Typography>
              <Typography variant="caption" color="text.disabled">
                {t('calendar.closedDays.emptyHint')}
              </Typography>
            </Box>
          ) : (
            <Box>
              {/* Place-wide closures */}
              {placeWideClosed.length > 0 && (
                <>
                  <Typography
                    variant="overline"
                    sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 0.5 }}
                  >
                    {t('calendar.closedDays.allLocations')}
                  </Typography>
                  <List dense disablePadding>
                    {placeWideClosed.map((cd) => (
                      <ListItem
                        key={cd.id}
                        disableGutters
                        sx={{
                          py: 0.75,
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          pr: 4,
                        }}
                        secondaryAction={
                          <IconButton
                            size="small"
                            edge="end"
                            aria-label="delete"
                            onClick={() => handleDelete(cd.id)}
                            sx={{ color: 'error.light' }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        }
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                              {cd.isRecurring ? (
                                <Repeat sx={{ fontSize: 14, color: 'text.secondary' }} />
                              ) : (
                                <Block sx={{ fontSize: 14, color: '#c62828' }} />
                              )}
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {cd.isRecurring
                                  ? t('calendar.closedDays.every', { day: t(`calendar.days.${cd.dayOfWeek!}`) })
                                  : format(new Date(cd.date!), 'MMM d, yyyy')}
                              </Typography>
                            </Box>
                          }
                          secondary={cd.reason || undefined}
                          slotProps={{ secondary: { style: { fontSize: '0.72rem' } } }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </>
              )}

              {/* Location-specific closures */}
              {locationClosed.length > 0 && (
                <>
                  <Typography
                    variant="overline"
                    sx={{
                      color: 'text.secondary',
                      fontWeight: 700,
                      display: 'block',
                      mb: 0.5,
                      mt: placeWideClosed.length > 0 ? 2 : 0,
                    }}
                  >
                    {t('calendar.closedDays.locationSpecific')}
                  </Typography>
                  <List dense disablePadding>
                    {locationClosed.map((cd) => (
                      <ListItem
                        key={cd.id}
                        disableGutters
                        sx={{
                          py: 0.75,
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          pr: 4,
                        }}
                        secondaryAction={
                          <IconButton
                            size="small"
                            edge="end"
                            aria-label="delete"
                            onClick={() => handleDelete(cd.id)}
                            sx={{ color: 'error.light' }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        }
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                              {cd.isRecurring ? (
                                <Repeat sx={{ fontSize: 14, color: 'text.secondary' }} />
                              ) : (
                                <Block sx={{ fontSize: 14, color: '#c62828' }} />
                              )}
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {cd.isRecurring
                                  ? t('calendar.closedDays.every', { day: t(`calendar.days.${cd.dayOfWeek!}`) })
                                  : format(new Date(cd.date!), 'MMM d, yyyy')}
                              </Typography>
                            </Box>
                          }
                          secondary={
                            <Box component="div" sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap', mt: 0.25 }}>
                              <Chip
                                label={cd.activityLocation?.name ?? 'Location'}
                                size="small"
                                sx={{ height: 16, fontSize: '0.6rem' }}
                              />
                              {cd.reason && (
                                <Typography variant="caption" color="text.secondary">
                                  {cd.reason}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </>
              )}
            </Box>
          )}
        </Paper>
      </Box>

      {/* ─── Add Closed Date Dialog ────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{t('calendar.dialog.title')}</DialogTitle>
        <DialogContent>
          <FormControlLabel
            control={
              <Switch
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                color="error"
              />
            }
            label={t('calendar.dialog.recurring')}
            sx={{ mb: 2, mt: 0.5 }}
          />

          {isRecurring ? (
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>{t('calendar.dialog.dayOfWeek')}</InputLabel>
              <Select
                value={dayOfWeek}
                label={t('calendar.dialog.dayOfWeek')}
                onChange={(e) => setDayOfWeek(Number(e.target.value))}
              >
                {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                  <MenuItem key={i} value={i}>{t(`calendar.days.${i}`)}</MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <TextField
              label={t('calendar.dialog.date')}
              type="date"
              size="small"
              fullWidth
              value={closedDate}
              onChange={(e) => setClosedDate(e.target.value)}
              sx={{ mb: 2 }}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          )}

          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>{t('calendar.dialog.appliesTo')}</InputLabel>
            <Select
              value={closedLocationId}
              label={t('calendar.dialog.appliesTo')}
              onChange={(e) => setClosedLocationId(e.target.value)}
            >
              <MenuItem value="">
                <em>{t('calendar.dialog.allLocations')}</em>
              </MenuItem>
              <Divider />
              {locations.map((loc) => (
                <MenuItem key={loc.id} value={loc.id}>
                  {loc.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label={t('calendar.dialog.reason')}
            size="small"
            fullWidth
            value={closedReason}
            onChange={(e) => setClosedReason(e.target.value)}
            placeholder={t('calendar.dialog.reasonPlaceholder')}
          />

          {saveError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {saveError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>
            {t('calendar.dialog.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={saving || (!isRecurring && !closedDate)}
            sx={{ bgcolor: '#c62828', '&:hover': { bgcolor: '#b71c1c' } }}
          >
            {saving ? t('calendar.dialog.saving') : t('calendar.dialog.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
