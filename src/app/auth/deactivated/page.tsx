import { Box, Button, Paper, Typography } from '@mui/material';
import { Block } from '@mui/icons-material';
import Link from 'next/link';

export default function DeactivatedPage() {
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
          Account Deactivated
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Your account has been deactivated. Please contact support if you believe this is a mistake.
        </Typography>
        <Link href="mailto:support@ontooff.com" style={{ textDecoration: 'none', display: 'block' }}>
          <Button variant="contained" fullWidth>
            Contact Support
          </Button>
        </Link>
      </Paper>
    </Box>
  );
}
