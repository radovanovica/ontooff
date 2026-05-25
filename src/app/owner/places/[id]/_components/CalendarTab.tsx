'use client';

import { useState, useEffect, useMemo } from 'react';
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

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ─── CalendarTab ─────────────────────────────────────────────────────────────

export default function CalendarTab({ placeId }: { placeId: string }) {
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
      setError('Failed to load calendar data');
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
        status: b.status,
        registrationNumber: b.registrationNumber,
        activityLocation: b.activityLocation?.name,
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
      setSaveError('Please select a date.');
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
      if (!res.ok) throw new Error(data.error ?? 'Failed to save');
      setClosedDates((prev) => [...prev, data.data]);
      setDialogOpen(false);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/places/${placeId}/closed-dates/${id}`, { method: 'DELETE' });
    if (res.ok) setClosedDates((prev) => prev.filter((cd) => cd.id !== id));
  };

  const handleEventClick = (registrationNumber: string) => {
    window.open(`/owner/bookings?search=${encodeURIComponent(registrationNumber)}`, '_blank');
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
            label="Closed"
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
          Click on any date to mark it as closed. Click a booking to open it.
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
                Closed Days
              </Typography>
            </Box>
            <Button
              size="small"
              variant="contained"
              startIcon={<Add />}
              onClick={() => openDialog()}
              sx={{ bgcolor: '#c62828', '&:hover': { bgcolor: '#b71c1c' }, minWidth: 0 }}
            >
              Add
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
                No closed days yet.
              </Typography>
              <Typography variant="caption" color="text.disabled">
                Click a calendar date or &ldquo;+ Add&rdquo; to block it.
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
                    All Locations
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
                                  ? `Every ${DAY_NAMES[cd.dayOfWeek!]}`
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
                    Location-Specific
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
                                  ? `Every ${DAY_NAMES[cd.dayOfWeek!]}`
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
        <DialogTitle sx={{ fontWeight: 700 }}>Block a Date / Day</DialogTitle>
        <DialogContent>
          <FormControlLabel
            control={
              <Switch
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                color="error"
              />
            }
            label="Recurring — block every week"
            sx={{ mb: 2, mt: 0.5 }}
          />

          {isRecurring ? (
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Day of week</InputLabel>
              <Select
                value={dayOfWeek}
                label="Day of week"
                onChange={(e) => setDayOfWeek(Number(e.target.value))}
              >
                {DAY_NAMES.map((d, i) => (
                  <MenuItem key={i} value={i}>{d}</MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <TextField
              label="Date"
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
            <InputLabel>Applies to</InputLabel>
            <Select
              value={closedLocationId}
              label="Applies to"
              onChange={(e) => setClosedLocationId(e.target.value)}
            >
              <MenuItem value="">
                <em>All locations (place-wide)</em>
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
            label="Reason (optional)"
            size="small"
            fullWidth
            value={closedReason}
            onChange={(e) => setClosedReason(e.target.value)}
            placeholder="e.g. Public holiday, Maintenance, Private event"
          />

          {saveError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {saveError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={saving || (!isRecurring && !closedDate)}
            sx={{ bgcolor: '#c62828', '&:hover': { bgcolor: '#b71c1c' } }}
          >
            {saving ? 'Saving…' : 'Block Date'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
