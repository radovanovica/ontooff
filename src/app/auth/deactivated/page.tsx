'use client';

import { Box, Button, Paper, Typography } from '@mui/material';
import { Block } from '@mui/icons-material';
import Link from 'next/link';
import { useTranslation } from '@/i18n/client';

export default function DeactivatedPage() {
  const { t } = useTranslation('auth');
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        px: 2,
      }}
    >
      <Paper elevation={3} sx={{ p: 5, width: '100%', maxWidth: 420, borderRadius: 3, textAlign: 'center' }}>
        <Block sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          {t('deactivated.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          {t('deactivated.body')}
        </Typography>
        <Link href="mailto:support@ontooff.com" style={{ textDecoration: 'none', display: 'block' }}>
          <Button variant="contained" fullWidth>
            {t('deactivated.contactSupport')}
          </Button>
        </Link>
      </Paper>
    </Box>
  );
}
