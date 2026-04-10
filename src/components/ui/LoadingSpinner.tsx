'use client';
import { Box, CircularProgress, Typography, Backdrop } from '@mui/material';

interface LoadingSpinnerProps {
  fullScreen?: boolean;
  message?: string;
  size?: number;
}

export default function LoadingSpinner({ fullScreen = false, message, size = 48 }: LoadingSpinnerProps) {
  if (fullScreen) {
    return (
      <Backdrop open sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1, flexDirection: 'column', gap: 2 }}>
        <CircularProgress color="inherit" size={size} thickness={3.5} />
        {message && (
          <Typography variant="body1" color="inherit" sx={{ fontWeight: 500 }}>
            {message}
          </Typography>
        )}
      </Backdrop>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        py: 6,
      }}
    >
      <CircularProgress
        size={size}
        thickness={3.5}
        sx={{ color: 'primary.main' }}
      />
      {message && (
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      )}
    </Box>
  );
}

export function InlineSpinner({ size = 20 }: { size?: number }) {
  return (
    <CircularProgress size={size} thickness={4} sx={{ color: 'inherit', display: 'inline-block', verticalAlign: 'middle' }} />
  );
}
