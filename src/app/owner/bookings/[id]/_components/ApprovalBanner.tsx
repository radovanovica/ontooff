'use client';

import { Alert, Collapse } from '@mui/material';
import { useSearchParams } from 'next/navigation';

export default function ApprovalBanner() {
  const params = useSearchParams();
  const confirmed = params.get('confirmed') === '1';
  const alreadyConfirmed = params.get('alreadyConfirmed') === '1';

  if (!confirmed && !alreadyConfirmed) return null;

  return (
    <Collapse in>
      <Alert severity={confirmed ? 'success' : 'info'} sx={{ mb: 2 }}>
        {confirmed
          ? '✅ Booking confirmed! The guest has been notified by email.'
          : 'ℹ️ This booking was already confirmed.'}
      </Alert>
    </Collapse>
  );
}
