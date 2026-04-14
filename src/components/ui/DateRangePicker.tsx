'use client';

/**
 * DateRangePicker
 * A single visual component that wraps two date inputs (from/to) as a
 * cohesive range selector. Works with react-hook-form (via Controller) or
 * standalone via value/onChange props.
 */

import { Box, TextField, Typography, Paper } from '@mui/material';
import { DateRange } from '@mui/icons-material';

interface DateRangePickerProps {
  /** Start date value (YYYY-MM-DD) */
  fromValue: string;
  /** End date value (YYYY-MM-DD) */
  toValue: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  fromError?: string;
  toError?: string;
  minFrom?: string;
  size?: 'small' | 'medium';
  /** If true renders as a compact inline bar (for filter bars) */
  inline?: boolean;
}

export default function DateRangePicker({
  fromValue,
  toValue,
  onFromChange,
  onToChange,
  fromError,
  toError,
  minFrom,
  size = 'medium',
  inline = false,
}: DateRangePickerProps) {
  const today = new Date().toISOString().split('T')[0];
  const minStart = minFrom ?? today;

  if (inline) {
    // ── Compact single-row variant for filter bars ──
    return (
      <Paper
        variant="outlined"
        sx={{
          display: 'flex',
          alignItems: 'center',
          borderRadius: 2,
          overflow: 'hidden',
          height: 40,
          minWidth: 260,
        }}
      >
        <DateRange sx={{ fontSize: 18, color: 'text.secondary', ml: 1.2, mr: 0.5, flexShrink: 0 }} />
        <TextField
          size="small"
          type="date"
          value={fromValue}
          onChange={(e) => {
            onFromChange(e.target.value);
            // Auto-correct: end must be after start
            if (toValue && e.target.value && e.target.value >= toValue) {
              onToChange('');
            }
          }}
          slotProps={{
            inputLabel: { shrink: true },
            htmlInput: { min: minStart },
          }}
          sx={{
            flex: 1,
            '& .MuiOutlinedInput-root': { border: 'none', borderRadius: 0 },
            '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
            '& input': { py: '8px', px: 1, fontSize: 13 },
          }}
        />
        <Box
          sx={{
            width: 1,
            bgcolor: 'divider',
            alignSelf: 'stretch',
            flexShrink: 0,
          }}
        />
        <TextField
          size="small"
          type="date"
          value={toValue}
          onChange={(e) => onToChange(e.target.value)}
          slotProps={{
            inputLabel: { shrink: true },
            htmlInput: { min: fromValue || minStart },
          }}
          sx={{
            flex: 1,
            '& .MuiOutlinedInput-root': { border: 'none', borderRadius: 0 },
            '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
            '& input': { py: '8px', px: 1, fontSize: 13 },
          }}
        />
      </Paper>
    );
  }

  // ── Full variant for form usage ──
  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        ...(fromError || toError
          ? { borderColor: 'error.main', borderWidth: 2 }
          : {}),
      }}
    >
      {/* Header label */}
      <Box
        sx={{
          px: 2,
          pt: 1.25,
          pb: 0.5,
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'grey.50',
        }}
      >
        <DateRange sx={{ fontSize: 16, color: 'text.secondary' }} />
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Select dates
        </Typography>
      </Box>

      {/* Two inputs side by side */}
      <Box sx={{ display: 'flex' }}>
        {/* From */}
        <Box sx={{ flex: 1, p: 1.5, borderRight: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
            Check-in
          </Typography>
          <TextField
            size={size}
            type="date"
            fullWidth
            value={fromValue}
            onChange={(e) => {
              onFromChange(e.target.value);
              if (toValue && e.target.value && e.target.value >= toValue) {
                onToChange('');
              }
            }}
            error={!!fromError}
            helperText={fromError}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { min: minStart },
            }}
            sx={{
              '& .MuiOutlinedInput-root': { borderRadius: 1 },
            }}
          />
        </Box>

        {/* To */}
        <Box sx={{ flex: 1, p: 1.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
            Check-out
          </Typography>
          <TextField
            size={size}
            type="date"
            fullWidth
            value={toValue}
            onChange={(e) => onToChange(e.target.value)}
            error={!!toError}
            helperText={toError}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { min: fromValue || minStart },
            }}
            sx={{
              '& .MuiOutlinedInput-root': { borderRadius: 1 },
            }}
          />
        </Box>
      </Box>
    </Paper>
  );
}
