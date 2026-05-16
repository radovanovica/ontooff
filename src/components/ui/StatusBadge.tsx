'use client';
import { Chip } from '@mui/material';
import { statusColors } from '@/lib/theme';
import { useTranslation } from '@/i18n/client';

interface StatusBadgeProps {
  status: string;
  label?: string;
  size?: 'small' | 'medium';
}

export default function StatusBadge({ status, label, size = 'small' }: StatusBadgeProps) {
  const { t } = useTranslation('common');
  const color = statusColors[status] ?? 'default';
  const displayLabel = label ?? t(`status.${status}`, { defaultValue: status });

  return (
    <Chip
      label={displayLabel}
      color={color}
      size={size}
      sx={{ fontWeight: 500, borderRadius: '4px', height: size === 'small' ? 22 : 28, fontSize: size === 'small' ? '0.72rem' : '0.8rem' }}
      variant="outlined"
    />
  );
}
