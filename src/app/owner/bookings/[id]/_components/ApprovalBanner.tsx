'use client';

import { Alert, Collapse } from '@mui/material';
import { useSearchParams } from 'next/navigation';
import { useTranslation } from '@/i18n/client';

export default function ApprovalBanner() {
  const params = useSearchParams();
  const { t } = useTranslation('owner');
  const confirmed = params.get('confirmed') === '1';
  const alreadyConfirmed = params.get('alreadyConfirmed') === '1';

  if (!confirmed && !alreadyConfirmed) return null;

  return (
    <Collapse in>
      <Alert severity={confirmed ? 'success' : 'info'} sx={{ mb: 2 }}>
        {confirmed
          ? t('bookings.confirmed')
          : t('bookings.alreadyConfirmed')}
      </Alert>
    </Collapse>
  );
}
