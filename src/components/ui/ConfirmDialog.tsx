'use client';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, CircularProgress
} from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';

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
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
  severity = 'warning',
}: ConfirmDialogProps) {
  const colors = {
    warning: { bg: '#fff8e1', icon: '#f4a259', btn: 'warning' as const },
    error: { bg: '#fdecea', icon: '#c0392b', btn: 'error' as const },
    info: { bg: '#e3f2fd', icon: '#2980b9', btn: 'primary' as const },
  };

  const c = colors[severity];

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ bgcolor: c.bg, borderRadius: '50%', p: 1, display: 'flex' }}>
            <WarningAmberRoundedIcon sx={{ color: c.icon, fontSize: 24 }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>{title}</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography color="text.secondary" sx={{ lineHeight: 1.6 }}>{message}</Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2.5, pt: 1 }}>
        <Button onClick={onCancel} disabled={loading} variant="outlined" color="inherit" sx={{ borderColor: 'divider' }}>
          {cancelLabel}
        </Button>
        <Button
          onClick={onConfirm}
          disabled={loading}
          variant="contained"
          color={c.btn}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {loading ? 'Processing…' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
