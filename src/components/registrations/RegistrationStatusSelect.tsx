'use client';

import { Chip, MenuItem, Select, SelectChangeEvent } from '@mui/material';
import { useTranslation } from '@/i18n/client';
import { statusColors } from '@/lib/theme';
import { RegistrationStatus } from '@/types';

const REGISTRATION_STATUSES = Object.values(RegistrationStatus);

interface RegistrationStatusSelectProps {
  value: string;
  onChange: (value: RegistrationStatus) => void | Promise<void>;
  namespace?: 'owner' | 'admin';
  disabled?: boolean;
}

export default function RegistrationStatusSelect({
  value,
  onChange,
  namespace = 'owner',
  disabled = false,
}: RegistrationStatusSelectProps) {
  const { t } = useTranslation(namespace);
  const labelPrefix = namespace === 'admin' ? 'registrations.statuses' : 'bookings.status';

  return (
    <Select
      value={value}
      size="small"
      variant="standard"
      disableUnderline
      disabled={disabled}
      onChange={(e: SelectChangeEvent) => onChange(e.target.value as RegistrationStatus)}
      renderValue={(val) => (
        <Chip
          label={t(`${labelPrefix}.${val as RegistrationStatus}`)}
          size="small"
          color={statusColors[val as string] ?? 'default'}
          variant="outlined"
          sx={{ fontWeight: 500, height: 22, fontSize: '0.72rem' }}
        />
      )}
      sx={{ minWidth: 120 }}
    >
      {REGISTRATION_STATUSES.map((status) => (
        <MenuItem key={status} value={status}>
          {t(`${labelPrefix}.${status}`)}
        </MenuItem>
      ))}
    </Select>
  );
}
