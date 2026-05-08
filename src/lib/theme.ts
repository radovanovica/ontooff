'use client';
import { createTheme } from '@mui/material/styles';

// Minimalistic natural palette — primary green accent, clean neutrals
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2d5a27',
      light: '#4a7c59',
      dark: '#1a3a18',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#8b5e3c',
      light: '#b07d55',
      dark: '#5c3d22',
      contrastText: '#ffffff',
    },
    success: {
      main: '#4caf50',
      light: '#81c784',
      dark: '#388e3c',
    },
    warning: {
      main: '#f59e0b',
      light: '#fcd34d',
      dark: '#d97706',
    },
    error: {
      main: '#dc2626',
      light: '#f87171',
      dark: '#991b1b',
    },
    info: {
      main: '#3b82f6',
      light: '#93c5fd',
      dark: '#1d4ed8',
    },
    background: {
      default: '#f9fafb',
      paper: '#ffffff',
    },
    text: {
      primary: '#111827',
      secondary: '#6b7280',
      disabled: '#9ca3af',
    },
    divider: '#e5e7eb',
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", Arial, sans-serif',
    h1: { fontWeight: 700, letterSpacing: '-0.025em' },
    h2: { fontWeight: 700, letterSpacing: '-0.02em' },
    h3: { fontWeight: 600, letterSpacing: '-0.01em' },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { fontWeight: 500, textTransform: 'none' as const, letterSpacing: '0' },
    body1: { lineHeight: 1.6 },
    body2: { lineHeight: 1.5 },
  },
  shape: {
    borderRadius: 6,
  },
  shadows: [
    'none',
    '0 1px 2px rgba(0,0,0,0.04)',
    '0 1px 4px rgba(0,0,0,0.06)',
    '0 2px 6px rgba(0,0,0,0.07)',
    '0 3px 8px rgba(0,0,0,0.08)',
    '0 4px 12px rgba(0,0,0,0.08)',
    '0 6px 16px rgba(0,0,0,0.09)',
    '0 8px 20px rgba(0,0,0,0.09)',
    '0 10px 24px rgba(0,0,0,0.10)',
    '0 12px 28px rgba(0,0,0,0.10)',
    '0 14px 32px rgba(0,0,0,0.11)',
    '0 16px 36px rgba(0,0,0,0.11)',
    '0 18px 40px rgba(0,0,0,0.12)',
    '0 20px 44px rgba(0,0,0,0.12)',
    '0 22px 48px rgba(0,0,0,0.12)',
    '0 24px 52px rgba(0,0,0,0.13)',
    '0 26px 56px rgba(0,0,0,0.13)',
    '0 28px 60px rgba(0,0,0,0.14)',
    '0 30px 64px rgba(0,0,0,0.14)',
    '0 32px 68px rgba(0,0,0,0.15)',
    '0 34px 72px rgba(0,0,0,0.15)',
    '0 36px 76px rgba(0,0,0,0.15)',
    '0 38px 80px rgba(0,0,0,0.16)',
    '0 40px 84px rgba(0,0,0,0.16)',
    '0 42px 88px rgba(0,0,0,0.17)',
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          padding: '8px 18px',
          fontSize: '0.875rem',
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
        contained: {
          backgroundColor: '#2d5a27',
          '&:hover': { backgroundColor: '#245120', boxShadow: 'none' },
        },
        outlined: {
          borderWidth: '1px',
          '&:hover': { borderWidth: '1px' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          border: '1px solid #e5e7eb',
          boxShadow: 'none',
          transition: 'border-color 0.15s',
          '&:hover': {
            boxShadow: 'none',
            borderColor: '#d1d5db',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 4, fontWeight: 500 },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 6,
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#2d5a27',
          backgroundImage: 'none',
          boxShadow: 'none',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        },
      },
    },
    MuiStepIcon: {
      styleOverrides: {
        root: {
          '&.Mui-active': { color: '#2d5a27' },
          '&.Mui-completed': { color: '#4a7c59' },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
        outlined: { border: '1px solid #e5e7eb' },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            background: '#f9fafb',
            fontWeight: 600,
            color: '#111827',
            borderBottom: '2px solid #e5e7eb',
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 6 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          textTransform: 'none',
          '&.Mui-selected': { color: '#2d5a27' },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: { backgroundColor: '#2d5a27', height: 2 },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#111827',
          borderRadius: 4,
          fontSize: '0.78rem',
          fontWeight: 400,
        },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: { backgroundColor: 'rgba(0,0,0,0.06)' },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: '#e5e7eb' },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 8, border: '1px solid #e5e7eb' },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: { borderRadius: 6, border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: { borderRadius: 6 },
      },
    },
  },
});

// Status color helpers
export const statusColors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  PENDING: 'warning',
  CONFIRMED: 'success',
  CANCELLED: 'error',
  COMPLETED: 'info',
  NO_SHOW: 'default',
  AVAILABLE: 'success',
  OCCUPIED: 'error',
  MAINTENANCE: 'warning',
  DISABLED: 'default',
  UNPAID: 'warning',
  PARTIALLY_PAID: 'info',
  PAID: 'success',
  REFUNDED: 'secondary',
  WAIVED: 'default',
};

export const spotAvailabilityColors = {
  available: '#4caf50',
  booked: '#c0392b',
  partial: '#f4a259',
  disabled: '#b0a090',
  selected: '#2d5a27',
  hover: '#4a7c59',
};
