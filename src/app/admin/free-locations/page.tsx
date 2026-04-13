'use client';

import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Switch,
  FormControlLabel,
  Divider,
  Stack,
  MenuItem,
} from '@mui/material';
import { Add, Edit, Delete, OpenInNew, MyLocation } from '@mui/icons-material';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import PageHeader from '@/components/ui/PageHeader';
import type { ActivityTag } from '@/types';

interface FreeLocationRow {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  country: string | null;
  isActive: boolean;
  createdAt: string;
  tags: { tag: ActivityTag }[];
}

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers and hyphens'),
  description: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  latitude: z.coerce.number().optional().or(z.literal('')),
  longitude: z.coerce.number().optional().or(z.literal('')),
  phone: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  instructions: z.string().optional(),
  isActive: z.boolean().default(true),
});

type FormValues = z.input<typeof schema>;

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function AdminFreeLocationsPage() {
  const [locations, setLocations] = useState<FreeLocationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tags, setTags] = useState<ActivityTag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FreeLocationRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);

  const { register, handleSubmit, reset, setValue, control, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const watchName = watch('name');

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/free-locations?isActive=all').then((r) => r.json()),
      fetch('/api/tags').then((r) => r.json()),
    ])
      .then(([loc, tag]) => {
        setLocations(loc.data ?? []);
        setTags(tag.data ?? []);
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditing(null);
    setSelectedTagIds([]);
    reset({ name: '', slug: '', description: '', address: '', city: '', country: '', latitude: '', longitude: '', phone: '', email: '', website: '', instructions: '', isActive: true });
    setOpen(true);
  };

  const openEdit = (loc: FreeLocationRow) => {
    setEditing(loc);
    setSelectedTagIds(loc.tags.map((t) => t.tag.id));
    // Fetch full data
    fetch(`/api/free-locations/${loc.id}`)
      .then((r) => r.json())
      .then((d) => {
        const full = d.data;
        reset({
          name: full.name,
          slug: full.slug,
          description: full.description ?? '',
          address: full.address ?? '',
          city: full.city ?? '',
          country: full.country ?? '',
          latitude: full.latitude ?? '',
          longitude: full.longitude ?? '',
          phone: full.phone ?? '',
          email: full.email ?? '',
          website: full.website ?? '',
          instructions: full.instructions ?? '',
          isActive: full.isActive,
        });
      });
    setOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    await fetch(`/api/free-locations/${id}`, { method: 'DELETE' });
    load();
  };

  const handleGeocode = async () => {
    const city = (document.querySelector('input[name="city"]') as HTMLInputElement)?.value ?? '';
    const country = (document.querySelector('input[name="country"]') as HTMLInputElement)?.value ?? '';
    const address = (document.querySelector('input[name="address"]') as HTMLInputElement)?.value ?? '';
    const q = [address, city, country].filter(Boolean).join(', ');
    if (!q) return;
    setGeocoding(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`);
      const results = await res.json();
      if (results[0]) {
        setValue('latitude', Number(results[0].lat));
        setValue('longitude', Number(results[0].lon));
      }
    } finally {
      setGeocoding(false);
    }
  };

  const onSubmit = async (data: FormValues) => {
    setSaving(true);
    setSaveError(null);
    try {
      const body = {
        ...data,
        latitude: data.latitude === '' ? null : Number(data.latitude) || null,
        longitude: data.longitude === '' ? null : Number(data.longitude) || null,
        email: data.email || null,
        website: data.website || null,
        tagIds: selectedTagIds,
      };
      const url = editing ? `/api/free-locations/${editing.id}` : '/api/free-locations';
      const method = editing ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Save failed');
      setOpen(false);
      load();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const toggleTag = (id: string) => {
    setSelectedTagIds((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]);
  };

  return (
    <Box>
      <PageHeader
        title="Free / Community Locations"
        subtitle="Public locations not tied to any business or booking system"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Free Locations' },
        ]}
        action={
          <Button variant="contained" startIcon={<Add />} onClick={openAdd} sx={{ bgcolor: '#7b3f00', '&:hover': { bgcolor: '#5a2e00' } }}>
            Add Location
          </Button>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Location</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Tags</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Created</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={32} />
                </TableCell>
              </TableRow>
            ) : locations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">No free locations yet. Add one!</Typography>
                </TableCell>
              </TableRow>
            ) : (
              locations.map((loc) => (
                <TableRow key={loc.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{loc.name}</Typography>
                    <Typography variant="caption" color="text.secondary">/locations/{loc.slug}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {[loc.city, loc.country].filter(Boolean).join(', ') || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
                      {loc.tags.slice(0, 3).map(({ tag }) => (
                        <Chip
                          key={tag.slug}
                          label={`${tag.icon ?? ''} ${tag.name}`}
                          size="small"
                          sx={{ bgcolor: (tag.color ?? '#7b3f00') + '18', color: tag.color ?? '#7b3f00', fontSize: '0.65rem', height: 20 }}
                        />
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip label={loc.isActive ? 'Active' : 'Inactive'} color={loc.isActive ? 'success' : 'default'} size="small" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{format(new Date(loc.createdAt), 'dd.MM.yyyy')}</Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="View public page">
                        <IconButton size="small" component={Link} href={`/locations/${loc.slug}`} target="_blank">
                          <OpenInNew fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEdit(loc)}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => handleDelete(loc.id, loc.name)}>
                          <Delete fontSize="small" />
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

      {/* Add / Edit Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editing ? `Edit: ${editing.name}` : 'Add Free Location'}</DialogTitle>
        <DialogContent dividers>
          {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError}</Alert>}
          <Box component="form" id="free-loc-form" onSubmit={handleSubmit(onSubmit)}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField
                  {...register('name')}
                  label="Name"
                  fullWidth
                  error={!!errors.name}
                  helperText={errors.name?.message}
                  onChange={(e) => {
                    register('name').onChange(e);
                    if (!editing) setValue('slug', slugify(e.target.value));
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  {...register('slug')}
                  label="Slug (URL)"
                  fullWidth
                  error={!!errors.slug}
                  helperText={errors.slug?.message ?? `Preview: /locations/${watchName ? slugify(String(watchName)) : '...'}`}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField {...register('description')} label="Description" fullWidth multiline rows={3} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Divider><Typography variant="caption">Location Details</Typography></Divider>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField {...register('address')} label="Address" fullWidth />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField {...register('city')} label="City" fullWidth />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField {...register('country')} label="Country" fullWidth />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Divider><Typography variant="caption">GPS Coordinates</Typography></Divider>
              </Grid>
              <Grid size={{ xs: 12, sm: 5 }}>
                <TextField
                  {...register('latitude')}
                  label="Latitude"
                  type="number"
                  fullWidth
                  helperText="e.g. 44.8176"
                  slotProps={{ htmlInput: { step: 'any' } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 5 }}>
                <TextField
                  {...register('longitude')}
                  label="Longitude"
                  type="number"
                  fullWidth
                  helperText="e.g. 20.4633"
                  slotProps={{ htmlInput: { step: 'any' } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 2 }} sx={{ display: 'flex', alignItems: 'flex-start', pt: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<MyLocation />}
                  onClick={handleGeocode}
                  disabled={geocoding}
                  fullWidth
                >
                  {geocoding ? '...' : 'Auto-fill'}
                </Button>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Divider><Typography variant="caption">Contact</Typography></Divider>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField {...register('phone')} label="Phone" fullWidth />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField {...register('email')} label="Email" fullWidth />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField {...register('website')} label="Website" fullWidth placeholder="https://" />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Divider><Typography variant="caption">Additional Info</Typography></Divider>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  {...register('instructions')}
                  label="How to Find It / Instructions"
                  fullWidth
                  multiline
                  rows={3}
                  helperText="Directions, parking info, access notes"
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Divider><Typography variant="caption">Categories / Tags</Typography></Divider>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  Select applicable activity categories:
                </Typography>
                <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
                  {tags.filter((t) => t.isActive).map((tag) => {
                    const selected = selectedTagIds.includes(tag.id);
                    return (
                      <Chip
                        key={tag.id}
                        label={`${tag.icon ?? ''} ${tag.name}`}
                        size="small"
                        onClick={() => toggleTag(tag.id)}
                        sx={{
                          cursor: 'pointer',
                          bgcolor: selected ? (tag.color ?? '#7b3f00') : 'transparent',
                          color: selected ? 'white' : 'text.primary',
                          border: `1.5px solid ${selected ? (tag.color ?? '#7b3f00') : '#ddd'}`,
                          fontWeight: selected ? 700 : 400,
                        }}
                      />
                    );
                  })}
                </Stack>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Controller
                  name="isActive"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                      label="Active (visible in search)"
                    />
                  )}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            type="submit"
            form="free-loc-form"
            variant="contained"
            disabled={saving}
            sx={{ bgcolor: '#7b3f00', '&:hover': { bgcolor: '#5a2e00' } }}
          >
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Location'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
