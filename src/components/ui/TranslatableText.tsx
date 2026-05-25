'use client';

import { useState } from 'react';
import { Typography, Box, Button, CircularProgress } from '@mui/material';
import { TranslateOutlined } from '@mui/icons-material';
import { useLocale, useTranslation } from '@/i18n/client';
import type { SxProps, Theme, TypographyProps } from '@mui/material';

interface Props {
  text: string;
  variant?: TypographyProps['variant'];
  sx?: SxProps<Theme>;
  color?: string;
}

export default function TranslatableText({ text, variant = 'body2', sx, color }: Props) {
  const locale = useLocale();
  const { t } = useTranslation('common');

  const [translated, setTranslated] = useState<string | null>(null);
  const [showTranslated, setShowTranslated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  async function handleTranslate() {
    if (translated) {
      setShowTranslated(true);
      return;
    }
    setLoading(true);
    setUnavailable(false);
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLocale: locale }),
      });
      if (res.status === 204) {
        // Already in target language — nothing to show
        setUnavailable(true);
        return;
      }
      const data = await res.json();
      if (data.translated) {
        setTranslated(data.translated);
        setShowTranslated(true);
      } else {
        setUnavailable(true);
      }
    } catch {
      setUnavailable(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box>
      <Typography
        variant={variant}
        sx={{ whiteSpace: 'pre-line', ...sx }}
        color={color}
      >
        {showTranslated && translated ? translated : text}
      </Typography>

      <Box sx={{ mt: 0.75, display: 'flex', alignItems: 'center', gap: 1 }}>
        {!showTranslated ? (
          <Button
            size="small"
            variant="text"
            onClick={handleTranslate}
            disabled={loading || unavailable}
            startIcon={
              loading
                ? <CircularProgress size={12} sx={{ color: 'inherit' }} />
                : <TranslateOutlined sx={{ fontSize: '14px !important' }} />
            }
            sx={{
              fontSize: '0.72rem',
              textTransform: 'none',
              p: 0,
              minWidth: 0,
              lineHeight: 1.4,
              color: 'primary.main',
              '&:hover': { background: 'none', textDecoration: 'underline' },
            }}
          >
            {loading ? t('common.translating', 'Translating…') : t('common.seeTranslation', 'See translation')}
          </Button>
        ) : (
          <Button
            size="small"
            variant="text"
            onClick={() => setShowTranslated(false)}
            sx={{
              fontSize: '0.72rem',
              textTransform: 'none',
              p: 0,
              minWidth: 0,
              lineHeight: 1.4,
              color: 'text.secondary',
              '&:hover': { background: 'none', textDecoration: 'underline' },
            }}
          >
            {t('common.seeOriginal', 'See original')}
          </Button>
        )}

        {unavailable && (
          <Typography variant="caption" color="text.disabled">
            {t('common.translationError', 'Translation unavailable')}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
