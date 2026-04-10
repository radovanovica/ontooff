'use client';
import { createTheme, alpha } from '@mui/material/styles';

// Natural color palette — greens, browns, earth tones
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2d5a27',       // Deep forest green
      light: '#4a7c59',
      dark: '#1a3a18',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#8b5e3c',       // Warm brown / bark
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
      main: '#f4a259',       // Warm amber
      light: '#f7c18a',
      dark: '#c47b2b',
    },
    error: {
      main: '#c0392b',
      light: '#e57373',
      dark: '#8e2020',
    },
    info: {
      main: '#2980b9',
      light: '#64b5f6',
      dark: '#1a5276',
    },
    background: {
      default: '#f7f3ee',    // Warm off-white / parchment
      paper: '#ffffff',
    },
    text: {
      primary: '#2c2416',    // Dark warm brown
      secondary: '#6b5c47',  // Medium warm brown
      disabled: '#b0a090',
    },
    divider: '#e8ddd0',
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", Arial, sans-serif',
    h1: { fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, letterSpacing: '-0.01em' },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { fontWeight: 600, textTransform: 'none' as const, letterSpacing: '0.01em' },
    body1: { lineHeight: 1.6 },
    body2: { lineHeight: 1.5 },
  },
  shape: {
    borderRadius: 10,
  },
  shadows: [
    'none',
    '0 1px 3px rgba(45,35,16,0.06)',
    '0 2px 6px rgba(45,35,16,0.08)',
    '0 4px 12px rgba(45,35,16,0.10)',
    '0 6px 16px rgba(45,35,16,0.12)',
    '0 8px 24px rgba(45,35,16,0.14)',
    '0 10px 32px rgba(45,35,16,0.16)',
    '0 12px 40px rgba(45,35,16,0.18)',
    '0 14px 48px rgba(45,35,16,0.20)',
    '0 16px 56px rgba(45,35,16,0.22)',
    '0 20px 64px rgba(45,35,16,0.24)',
    '0 24px 72px rgba(45,35,16,0.26)',
    '0 28px 80px rgba(45,35,16,0.28)',
    '0 32px 88px rgba(45,35,16,0.30)',
    '0 36px 96px rgba(45,35,16,0.32)',
    '0 40px 104px rgba(45,35,16,0.34)',
    '0 44px 112px rgba(45,35,16,0.36)',
    '0 48px 120px rgba(45,35,16,0.38)',
    '0 52px 128px rgba(45,35,16,0.40)',
    '0 56px 136px rgba(45,35,16,0.42)',
    '0 60px 144px rgba(45,35,16,0.44)',
    '0 64px 152px rgba(45,35,16,0.46)',
    '0 68px 160px rgba(45,35,16,0.48)',
    '0 72px 168px rgba(45,35,16,0.50)',
    '0 76px 176px rgba(45,35,16,0.52)',
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 24px',
          fontSize: '0.9375rem',
          boxShadow: 'none',
          '&:hover': { boxShadow: '0 4px 12px rgba(45,90,39,0.25)' },
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #2d5a27 0%, #4a7c59 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #1a3a18 0%, #2d5a27 100%)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid #e8ddd0',
          boxShadow: '0 2px 8px rgba(45,35,16,0.06)',
          transition: 'box-shadow 0.2s ease, transform 0.2s ease',
          '&:hover': {
            boxShadow: '0 6px 20px rgba(45,35,16,0.12)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 6, fontWeight: 500 },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#4a7c59',
            },
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(135deg, #2d5a27 0%, #4a7c59 100%)',
          boxShadow: '0 2px 8px rgba(45,35,16,0.15)',
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
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            background: '#f0ebe4',
            fontWeight: 600,
            color: '#2c2416',
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          textTransform: 'none',
          '&.Mui-selected': { color: '#2d5a27' },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: { backgroundColor: '#2d5a27' },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#2c2416',
          borderRadius: 6,
          fontSize: '0.8rem',
        },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: { backgroundColor: alpha('#8b7355', 0.12) },
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
