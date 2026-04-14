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
          alignItems: 'stretch',
          borderRadius: 2,
          overflow: 'hidden',
          minWidth: 260,
        }}
      >
        {/* Check-in */}
        <Box sx={{ flex: 1, px: 1.5, py: 0.75, borderRight: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.4, fontSize: 10, mb: 0.25 }}>
            Check-in
          </Typography>
          <TextField
            size="small"
            type="date"
            value={fromValue}
            onChange={(e) => {
              onFromChange(e.target.value);
              if (toValue && e.target.value && e.target.value >= toValue) {
                onToChange('');
              }
            }}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { min: minStart },
            }}
            sx={{
              '& .MuiOutlinedInput-root': { border: 'none', borderRadius: 0, p: 0 },
              '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
              '& input': { py: 0, px: 0, fontSize: 13, height: 24 },
            }}
          />
        </Box>

        {/* Check-out */}
        <Box sx={{ flex: 1, px: 1.5, py: 0.75 }}>
          <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.4, fontSize: 10, mb: 0.25 }}>
            Check-out
          </Typography>
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
              '& .MuiOutlinedInput-root': { border: 'none', borderRadius: 0, p: 0 },
              '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
              '& input': { py: 0, px: 0, fontSize: 13, height: 24 },
            }}
          />
        </Box>
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
