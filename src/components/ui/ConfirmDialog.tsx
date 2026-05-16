'use client';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, CircularProgress
} from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { useTranslation } from '@/i18n/client';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  severity?: 'warning' | 'error' | 'info';
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  loading = false,
  severity = 'warning',
}: ConfirmDialogProps) {
  const { t } = useTranslation('common');
  const resolvedConfirmLabel = confirmLabel ?? t('common.confirm');
  const resolvedCancelLabel = cancelLabel ?? t('common.cancel');
  const iconColor = { warning: '#f59e0b', error: '#dc2626', info: '#3b82f6' }[severity];
  const btnColor = { warning: 'warning' as const, error: 'error' as const, info: 'primary' as const }[severity];

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <WarningAmberRoundedIcon sx={{ color: iconColor, fontSize: 22, flexShrink: 0 }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>{title}</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography color="text.secondary" sx={{ lineHeight: 1.6 }}>{message}</Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2.5, pt: 1 }}>
        <Button onClick={onCancel} disabled={loading} variant="outlined" color="inherit" sx={{ borderColor: 'divider' }}>
          {resolvedCancelLabel}
        </Button>
        <Button
          onClick={onConfirm}
          disabled={loading}
          variant="contained"
          color={btnColor}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {loading ? t('common.processing') : resolvedConfirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
