'use client';

import { IconButton, Menu, MenuItem, Tooltip, Typography, Box } from '@mui/material';
import { KeyboardArrowDown } from '@mui/icons-material';
import { useState } from 'react';
import Image from 'next/image';
import { useLocale, changeLanguage } from '@/i18n/client';
import type { Locale } from '@/i18n/config';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '/assets/images/en.jpg' },
  { code: 'sr', label: 'Srpski',  flag: '/assets/images/srb.png' },
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
          sx={{
            color: 'inherit',
            gap: 0.5,
            px: 1,
            borderRadius: 1.5,
            '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
          }}
        >
          <Box
            sx={{
              width: 22,
              height: 16,
              borderRadius: '3px',
              overflow: 'hidden',
              flexShrink: 0,
              position: 'relative',
              boxShadow: '0 0 0 1px rgba(0,0,0,0.15)',
            }}
          >
            <Image
              src={current.flag}
              alt={current.label}
              fill
              unoptimized
              style={{ objectFit: 'cover' }}
            />
          </Box>
          <Typography variant="caption" sx={{ fontWeight: 600, lineHeight: 1, letterSpacing: 0.3 }}>
            {current.code.toUpperCase()}
          </Typography>
          <KeyboardArrowDown sx={{ fontSize: 14, opacity: 0.7 }} />
        </IconButton>
      </Tooltip>

      <Menu
        id="language-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { elevation: 3, sx: { mt: 0.5, minWidth: 150, borderRadius: 2 } } }}
      >
        {LANGUAGES.map((lang) => (
          <MenuItem
            key={lang.code}
            onClick={() => handleSelect(lang.code as Locale)}
            selected={lang.code === locale}
            sx={{
              gap: 1.5,
              px: 2,
              py: 1,
              '&.Mui-selected': { bgcolor: 'action.selected', fontWeight: 700 },
            }}
          >
            <Box
              sx={{
                width: 26,
                height: 18,
                borderRadius: '3px',
                overflow: 'hidden',
                flexShrink: 0,
                position: 'relative',
                boxShadow: '0 0 0 1px rgba(0,0,0,0.12)',
              }}
            >
              <Image
                src={lang.flag}
                alt={lang.label}
                fill
                unoptimized
                style={{ objectFit: 'cover' }}
              />
            </Box>
            <Typography variant="body2" sx={{ fontWeight: lang.code === locale ? 700 : 400 }}>
              {lang.label}
            </Typography>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
