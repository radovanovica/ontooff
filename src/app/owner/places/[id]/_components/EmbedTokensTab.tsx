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
} from '@mui/material';
import { Add, ContentCopy, Delete } from '@mui/icons-material';
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
}

export default function EmbedTokensTab({ placeId }: { placeId: string }) {
  const { t } = useTranslation('owner');
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { register, handleSubmit, reset } = useForm<{ label: string; expiresAt?: string }>();

  const fetch_ = () => {
    fetch(`/api/embed-tokens?placeId=${placeId}`)
      .then((r) => r.json())
      .then((d) => setTokens(d.data ?? d))
      .catch(() => setError(t('embedTokens.errors.loadFailed')))
      .finally(() => setLoading(false));
  };

  useEffect(fetch_, [placeId]);

  const onCreate = async (data: { label: string; expiresAt?: string }) => {
    const res = await fetch('/api/embed-tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        placeId,
        label: data.label,
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

  const copyToClipboard = (token: string) => {
    const url = `${window.location.origin}/embed/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
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
              <TableCell sx={{ fontWeight: 700 }}>{t('embedTokens.usageCount', { count: 0 }).replace('0 ', '')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('embedTokens.lastUsed', { date: '' }).replace(' ', '')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('embedTokens.table.expires')}</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {tokens.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
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
                  <TableCell>{token.useCount}</TableCell>
                  <TableCell>
                    {token.lastUsedAt ? format(new Date(token.lastUsedAt), 'dd.MM.yyyy') : t('embedTokens.never')}
                  </TableCell>
                  <TableCell>
                    {token.expiresAt ? format(new Date(token.expiresAt), 'dd.MM.yyyy') : '—'}
                  </TableCell>
                  <TableCell>
                    <Tooltip title={t('embedTokens.copy')}>
                      <IconButton size="small" onClick={() => copyToClipboard(token.token)}>
                        <ContentCopy fontSize="small" />
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

      <Snackbar open={copied} autoHideDuration={2000} onClose={() => setCopied(false)} message={t('embedTokens.copied')} />
    </Box>
  );
}
