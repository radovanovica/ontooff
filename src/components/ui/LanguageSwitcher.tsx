'use client';

import { IconButton, Menu, MenuItem, Tooltip, Typography, Box } from '@mui/material';
import { Language as LanguageIcon } from '@mui/icons-material';
import { useState } from 'react';
import { useLocale, changeLanguage } from '@/i18n/client';
import type { Locale } from '@/i18n/config';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'sr', label: 'Srpski', flag: '🇷🇸' },
] as const;

export default function LanguageSwitcher() {
  const locale = useLocale();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const current = LANGUAGES.find((l) => l.code === locale) ?? LANGUAGES[0];

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelect = (code: Locale) => {
    changeLanguage(code);
    handleClose();
  };

  return (
    <>
      <Tooltip title="Change language">
        <IconButton
          onClick={handleOpen}
          size="small"
          aria-label="change language"
          aria-controls={open ? 'language-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
          sx={{ color: 'inherit', gap: 0.5 }}
        >
          <LanguageIcon fontSize="small" />
          <Typography variant="caption" sx={{ fontWeight: 600, lineHeight: 1 }}>
            {current.code.toUpperCase()}
          </Typography>
        </IconButton>
      </Tooltip>
      <Menu
        id="language-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {LANGUAGES.map((lang) => (
          <MenuItem
            key={lang.code}
            onClick={() => handleSelect(lang.code as Locale)}
            selected={lang.code === locale}
            sx={{ gap: 1, minWidth: 130 }}
          >
            <Box component="span" sx={{ fontSize: '1.1rem' }}>
              {lang.flag}
            </Box>
            <Typography variant="body2">{lang.label}</Typography>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
