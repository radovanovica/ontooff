'use client';

import {
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Paper,
  Divider,
  Tooltip,
  IconButton,
} from '@mui/material';
import { Add, Settings, Code, Delete, ContentCopy, Check } from '@mui/icons-material';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/i18n/client';
import EmptyState from '@/components/ui/EmptyState';

interface LocationData {
  id: string;
  name: string;
  description: string | null;
  requiresSpot: boolean;
  maxCapacity: number | null;
  isActive: boolean;
  activityTypes: Array<{ activityType: { name: string; icon: string | null; color: string | null } }>;
  _count?: { spots: number };
}

interface EmbedTokenData {
  id: string;
  token: string;
  label: string;
  isActive: boolean;
  useCount: number;
  expiresAt: string | null;
  lastUsedAt: string | null;
}

export default function LocationsTab({ placeId }: { placeId: string }) {
  const { t } = useTranslation('owner');
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Embed dialog state
  const [embedDialogLocation, setEmbedDialogLocation] = useState<LocationData | null>(null);
  const [embedTokens, setEmbedTokens] = useState<EmbedTokenData[]>([]);
  const [embedTokensLoading, setEmbedTokensLoading] = useState(false);
  const [embedCreateLabel, setEmbedCreateLabel] = useState('');
  const [embedCreateExpiry, setEmbedCreateExpiry] = useState('');
  const [embedCreating, setEmbedCreating] = useState(false);
  const [embedError, setEmbedError] = useState<string | null>(null);
  const [embedCopied, setEmbedCopied] = useState<string | null>(null);

  const APP_URL = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    fetch(`/api/activity-locations?placeId=${placeId}`)
      .then((r) => r.json())
      .then((d) => setLocations(d.data ?? []))
      .catch(() => setError(t('locations.errors.loadFailed')))
      .finally(() => setLoading(false));
  }, [placeId]);

  const openEmbedDialog = (loc: LocationData) => {
    setEmbedDialogLocation(loc);
    setEmbedError(null);
    setEmbedCreateLabel('');
    setEmbedCreateExpiry('');
    setEmbedTokens([]);
    setEmbedTokensLoading(true);
    fetch(`/api/embed-tokens?placeId=${placeId}&activityLocationId=${loc.id}`)
      .then((r) => r.json())
      .then((d) => setEmbedTokens(d.data ?? []))
      .catch(() => setEmbedError(t('embedTokens.errors.loadFailed')))
      .finally(() => setEmbedTokensLoading(false));
  };

  const handleCreateEmbedToken = async () => {
    if (!embedDialogLocation || !embedCreateLabel.trim()) return;
    setEmbedCreating(true);
    setEmbedError(null);
    try {
      const res = await fetch('/api/embed-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeId,
          activityLocationId: embedDialogLocation.id,
          label: embedCreateLabel.trim(),
          expiresAt: embedCreateExpiry ? new Date(`${embedCreateExpiry}T00:00:00.000Z`).toISOString() : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? t('embedTokens.errors.createFailed'));
      setEmbedTokens((prev) => [json.data, ...prev]);
      setEmbedCreateLabel('');
      setEmbedCreateExpiry('');
    } catch (err) {
      setEmbedError(err instanceof Error ? err.message : t('embedTokens.errors.createFailed'));
    } finally {
      setEmbedCreating(false);
    }
  };

  const handleDeleteEmbedToken = async (id: string) => {
    if (!confirm(t('embedTokens.deleteConfirm'))) return;
    const res = await fetch(`/api/embed-tokens?id=${id}`, { method: 'DELETE' });
    if (res.ok) setEmbedTokens((prev) => prev.filter((tok) => tok.id !== id));
  };

  const copyEmbedTokenUrl = (token: string, type: 'url' | 'iframe') => {
    const url = `${APP_URL}/embed/${token}`;
    const text = type === 'iframe'
      ? `<iframe src="${url}" width="100%" height="700" frameborder="0" allow="payment"></iframe>`
      : url;
    navigator.clipboard.writeText(text).catch(() => {});
    setEmbedCopied(token + type);
    setTimeout(() => setEmbedCopied(null), 2000);
  };

  if (loading) return <CircularProgress />;

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
        <Button
          component={Link}
          href={`/owner/places/${placeId}/locations/new`}
          variant="contained"
          startIcon={<Add />}
        >
          {t('locations.addNew')}
        </Button>
      </Box>

      {locations.length === 0 ? (
        <EmptyState
          title={t('locations.title')}
          description=""
          action={
            <Button component={Link} href={`/owner/places/${placeId}/locations/new`} variant="contained" startIcon={<Add />}>
              {t('locations.addNew')}
            </Button>
          }
        />
      ) : (
        <Grid container spacing={2}>
          {locations.map((loc) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={loc.id}>
              <Card elevation={1} sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    {loc.activityTypes[0]?.activityType.icon && (
                      <Typography sx={{ fontSize: '1.25rem' }}>{loc.activityTypes[0].activityType.icon}</Typography>
                    )}
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {loc.name}
                    </Typography>
                    <Chip
                      label={loc.isActive ? t('common.active') : t('common.inactive')}
                      color={loc.isActive ? 'success' : 'default'}
                      size="small"
                      sx={{ ml: 'auto' }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1, mx: 1 }}>
                    {loc.activityTypes.map(({ activityType: at }) => (
                      <Chip key={at.name} label={at.name} size="small" variant="outlined" />
                    ))}
                  </Box>
                  {loc.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {loc.description}
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {loc._count && (
                      <Typography variant="caption" color="text.secondary">
                        {t('locations.spotsCount', { count: loc._count.spots })}
                      </Typography>
                    )}
                    {loc.maxCapacity && (
                      <Typography variant="caption" color="text.secondary">
                        · {t('locations.maxCapacityLabel', { count: loc.maxCapacity })}
                      </Typography>
                    )}
                  </Box>
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2, gap: 1 }}>
                  <Button
                    component={Link}
                    href={`/owner/places/${placeId}/locations/${loc.id}`}
                    variant="outlined"
                    size="small"
                    startIcon={<Settings />}
                    sx={{ flex: 1 }}
                  >
                    {t('common.manage')}
                  </Button>
                  <Tooltip title={t('embedTokens.title', 'Embed')}>
                    <IconButton size="small" onClick={() => openEmbedDialog(loc)} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                      <Code fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* ── Embed token dialog ──────────────────────────────────────────── */}
      <Dialog open={!!embedDialogLocation} onClose={() => setEmbedDialogLocation(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Code fontSize="small" />
          {t('locations.embedDialog.title', 'Embed — {{name}}', { name: embedDialogLocation?.name ?? '' })}
        </DialogTitle>
        <DialogContent sx={{ pt: '12px !important' }}>
          {embedError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setEmbedError(null)}>{embedError}</Alert>}

          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            {t('locations.embedDialog.createNew', 'Create New Token')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
            <TextField
              size="small"
              label={t('embedTokens.form.label', 'Label')}
              value={embedCreateLabel}
              onChange={(e) => setEmbedCreateLabel(e.target.value)}
              sx={{ flex: '1 1 160px' }}
            />
            <TextField
              size="small"
              label={t('embedTokens.form.expiresAt', 'Expires (optional)')}
              type="date"
              value={embedCreateExpiry}
              onChange={(e) => setEmbedCreateExpiry(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ flex: '1 1 150px' }}
            />
            <Button
              variant="contained"
              size="small"
              startIcon={embedCreating ? <CircularProgress size={14} color="inherit" /> : <Add />}
              disabled={embedCreating || !embedCreateLabel.trim()}
              onClick={handleCreateEmbedToken}
            >
              {t('common.create', 'Create')}
            </Button>
          </Box>

          <Divider sx={{ mb: 2 }} />

          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            {t('locations.embedDialog.tokens', 'Tokens')}
          </Typography>
          {embedTokensLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={28} /></Box>
          ) : embedTokens.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              {t('locations.embedDialog.noTokens', 'No tokens yet. Create one above.')}
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {embedTokens.map((tok) => {
                const embedUrl = `${APP_URL}/embed/${tok.token}`;
                const iframeCode = `<iframe src="${embedUrl}" width="100%" height="700" frameborder="0" allow="payment"></iframe>`;
                return (
                  <Paper key={tok.id} variant="outlined" sx={{ p: 1.5, borderRadius: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{tok.label}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {tok.expiresAt && (
                          <Typography variant="caption" color="text.secondary">
                            {t('embedTokens.form.expiresAt', 'Expires')} {new Date(tok.expiresAt).toLocaleDateString()}
                          </Typography>
                        )}
                        <Chip label={`${tok.useCount} uses`} size="small" sx={{ height: 18, fontSize: '0.68rem' }} />
                        <Tooltip title={t('common.delete', 'Delete')}>
                          <IconButton size="small" color="error" onClick={() => handleDeleteEmbedToken(tok.id)}>
                            <Delete sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                    {/* Direct URL */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', flex: 1, bgcolor: 'grey.100', borderRadius: 0.5, px: 0.75, py: 0.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {embedUrl}
                      </Typography>
                      <Tooltip title={embedCopied === tok.token + 'url' ? t('embedTokens.copied', 'Copied!') : t('embedTokens.embedUrl', 'Copy URL')}>
                        <IconButton size="small" color={embedCopied === tok.token + 'url' ? 'success' : 'default'} onClick={() => copyEmbedTokenUrl(tok.token, 'url')}>
                          {embedCopied === tok.token + 'url' ? <Check sx={{ fontSize: 16 }} /> : <ContentCopy sx={{ fontSize: 16 }} />}
                        </IconButton>
                      </Tooltip>
                    </Box>
                    {/* iFrame snippet */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', flex: 1, bgcolor: 'grey.100', borderRadius: 0.5, px: 0.75, py: 0.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'text.secondary' }}>
                        {iframeCode}
                      </Typography>
                      <Tooltip title={embedCopied === tok.token + 'iframe' ? t('embedTokens.copied', 'Copied!') : t('embedTokens.embedCode', 'Copy iFrame')}>
                        <IconButton size="small" color={embedCopied === tok.token + 'iframe' ? 'success' : 'default'} onClick={() => copyEmbedTokenUrl(tok.token, 'iframe')}>
                          {embedCopied === tok.token + 'iframe' ? <Check sx={{ fontSize: 16 }} /> : <Code sx={{ fontSize: 16 }} />}
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmbedDialogLocation(null)}>{t('common.close', 'Close')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
