'use client';

import { Chip, MenuItem, Select, SelectChangeEvent } from '@mui/material';
import { useTranslation } from '@/i18n/client';
import { statusColors } from '@/lib/theme';
import { PaymentStatus } from '@/types';

const PAYMENT_STATUSES = Object.values(PaymentStatus);

interface RegistrationPaymentStatusSelectProps {
  value: string;
  onChange: (value: PaymentStatus) => void | Promise<void>;
  namespace?: 'owner' | 'admin';
  disabled?: boolean;
}

export default function RegistrationPaymentStatusSelect({
  value,
  onChange,
  namespace = 'owner',
  disabled = false,
}: RegistrationPaymentStatusSelectProps) {
  const { t } = useTranslation(namespace);
  const labelPrefix =
    namespace === 'admin' ? 'registrations.paymentStatuses' : 'bookings.paymentStatus';

  return (
    <Select
      value={value}
      size="small"
      variant="standard"
      disableUnderline
      disabled={disabled}
      onChange={(e: SelectChangeEvent) => onChange(e.target.value as PaymentStatus)}
      renderValue={(val) => (
        <Chip
          label={t(`${labelPrefix}.${val}`)}
          size="small"
          color={statusColors[val as string] ?? 'default'}
          variant="outlined"
          sx={{ fontWeight: 500, height: 22, fontSize: '0.72rem' }}
        />
      )}
      sx={{ minWidth: 140 }}
    >
      {PAYMENT_STATUSES.map((status) => (
        <MenuItem key={status} value={status}>
          {t(`${labelPrefix}.${status}`)}
        </MenuItem>
      ))}
    </Select>
  );
}
