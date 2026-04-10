'use client';
import { Chip } from '@mui/material';
import { statusColors } from '@/lib/theme';

interface StatusBadgeProps {
  status: string;
  label?: string;
  size?: 'small' | 'medium';
}

const statusLabels: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
  NO_SHOW: 'No Show',
  AVAILABLE: 'Available',
  OCCUPIED: 'Occupied',
  MAINTENANCE: 'Maintenance',
  DISABLED: 'Disabled',
  UNPAID: 'Unpaid',
  PARTIALLY_PAID: 'Partial',
  PAID: 'Paid',
  REFUNDED: 'Refunded',
  WAIVED: 'Waived',
  SUPER_ADMIN: 'Super Admin',
  PLACE_OWNER: 'Place Owner',
  USER: 'User',
};

export default function StatusBadge({ status, label, size = 'small' }: StatusBadgeProps) {
  const color = statusColors[status] ?? 'default';
  const displayLabel = label ?? statusLabels[status] ?? status;

  return (
    <Chip
      label={displayLabel}
      color={color}
      size={size}
      sx={{ fontWeight: 500, borderRadius: '6px' }}
      variant="filled"
    />
  );
}
