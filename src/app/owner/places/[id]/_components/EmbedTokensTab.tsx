'use client';

import {
  Box,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Snackbar,
  MenuItem,
} from '@mui/material';
import { Add, Check, Code, ContentCopy, Delete } from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { useTranslation } from '@/i18n/client';

interface TokenData {
  id: string;
  label: string;
  token: string;
  isActive: boolean;
  useCount: number;
  expiresAt: string | null;
  lastUsedAt: string | null;
  activityTypeId: string | null;
}

interface ActivityTypeOption {
  id: string;
  name: string;
}

export default function EmbedTokensTab({ placeId }: { placeId: string }) {
  const { t } = useTranslation('owner');
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [activityTypes, setActivityTypes] = useState<ActivityTypeOption[]>([]);
  const { register, handleSubmit, reset } = useForm<{ label: string; expiresAt?: string; activityTypeId?: string }>();

  const fetch_ = () => {
    fetch(`/api/embed-tokens?placeId=${placeId}`)
      .then((r) => r.json())
      .then((d) => setTokens(d.data ?? d))
      .catch(() => setError(t('embedTokens.errors.loadFailed')))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetch_();
    fetch(`/api/activity-types?placeId=${placeId}`)
      .then((r) => r.json())
      .then((d) => setActivityTypes(d.data ?? []))
      .catch(() => {/* non-critical */});
  }, [placeId]);

  const onCreate = async (data: { label: string; expiresAt?: string; activityTypeId?: string }) => {
    const res = await fetch('/api/embed-tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        placeId,
        label: data.label,
        activityTypeId: data.activityTypeId || undefined,
        expiresAt: data.expiresAt ? new Date(`${data.expiresAt}T00:00:00.000Z`).toISOString() : undefined,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error ?? t('embedTokens.errors.createFailed'));
    }
    setDialogOpen(false);
    reset();
    fetch_();
  };

  const onDelete = async (id: string) => {
    if (!confirm(t('embedTokens.deleteConfirm'))) return;
    const res = await fetch(`/api/embed-tokens?id=${id}`, { method: 'DELETE' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? t('embedTokens.errors.deleteFailed'));
      return;
    }
    fetch_();
  };

  const copyToClipboard = (token: string, type: 'url' | 'iframe') => {
    const url = `https://www.ontooff.app/embed/${token}`;
    const text = type === 'iframe'
      ? `<iframe src="${url}" width="100%" height="700" frameborder="0" allow="payment"></iframe>`
      : url;
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedToken(token + type);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  if (loading) return <CircularProgress />;

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
        <Button variant="contained" startIcon={<Add />} onClick={() => setDialogOpen(true)}>
          {t('embedTokens.addNew')}
        </Button>
      </Box>

      <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>{t('embedTokens.form.label')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('embedTokens.table.token')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('embedTokens.table.activityType', { defaultValue: 'Activity' })}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('embedTokens.usageCount', { count: 0 }).replace('0 ', '')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('embedTokens.lastUsed', { date: '' }).replace(' ', '')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('embedTokens.table.expires')}</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {tokens.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">{t('embedTokens.empty')}</Typography>
                </TableCell>
              </TableRow>
            ) : (
              tokens.map((token) => (
                <TableRow key={token.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{token.label}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {token.token.slice(0, 20)}…
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {token.activityTypeId
                      ? (activityTypes.find((a) => a.id === token.activityTypeId)?.name ?? '—')
                      : <Typography variant="caption" color="text.secondary">{t('embedTokens.table.allActivities', { defaultValue: 'All' })}</Typography>}
                  </TableCell>
                  <TableCell>{token.useCount}</TableCell>
                  <TableCell>
                    {token.lastUsedAt ? format(new Date(token.lastUsedAt), 'dd.MM.yyyy') : t('embedTokens.never')}
                  </TableCell>
                  <TableCell>
                    {token.expiresAt ? format(new Date(token.expiresAt), 'dd.MM.yyyy') : '—'}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title={copiedToken === token.token + 'url' ? t('embedTokens.copied') : t('embedTokens.copy')}>
                      <IconButton size="small" color={copiedToken === token.token + 'url' ? 'success' : 'default'} onClick={() => copyToClipboard(token.token, 'url')}>
                        {copiedToken === token.token + 'url' ? <Check fontSize="small" /> : <ContentCopy fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={copiedToken === token.token + 'iframe' ? t('embedTokens.copied') : t('embedTokens.embedCode', 'Copy iFrame')}>
                      <IconButton size="small" color={copiedToken === token.token + 'iframe' ? 'success' : 'default'} onClick={() => copyToClipboard(token.token, 'iframe')}>
                        {copiedToken === token.token + 'iframe' ? <Check fontSize="small" /> : <Code fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('common.delete')}>
                      <IconButton size="small" color="error" onClick={() => onDelete(token.id)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('embedTokens.addNew')}</DialogTitle>
        <Box
          component="form"
          onSubmit={handleSubmit(async (formData) => {
            try {
              setError(null);
              await onCreate(formData);
            } catch (err) {
              setError(err instanceof Error ? err.message : t('embedTokens.errors.createFailed'));
            }
          })}
        >
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField {...register('label', { required: true })} label={t('embedTokens.form.label')} fullWidth />
            {activityTypes.length > 1 && (
              <TextField
                {...register('activityTypeId')}
                select
                label={t('embedTokens.form.activityType', { defaultValue: 'Lock to Activity (optional)' })}
                fullWidth
                defaultValue=""
              >
                <MenuItem value="">{t('embedTokens.form.activityTypeAll', { defaultValue: 'All activities (general token)' })}</MenuItem>
                {activityTypes.map((at) => (
                  <MenuItem key={at.id} value={at.id}>{at.name}</MenuItem>
                ))}
              </TextField>
            )}
            <TextField
              {...register('expiresAt')}
              label={t('embedTokens.form.expiresAt')}
              type="date"
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" variant="contained">{t('common.create')}</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Snackbar open={!!copiedToken} autoHideDuration={2000} onClose={() => setCopiedToken(null)} message={t('embedTokens.copied')} />
    </Box>
  );
}
