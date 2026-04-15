'use client';

import { Box, Typography, Divider } from '@mui/material';
import Image from 'next/image';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';

interface EmbedHeaderProps {
  placeName: string | null;
  logoUrl: string | null;
}

export default function EmbedHeader({ placeName, logoUrl }: EmbedHeaderProps) {
  return (
    <Box>
      {/* Top bar: place branding + language switcher */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
          px: 0.5,
        }}
      >
        {/* Place logo + name */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {logoUrl && (
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1.5,
                overflow: 'hidden',
                flexShrink: 0,
                border: '1.5px solid',
                borderColor: 'divider',
                position: 'relative',
              }}
            >
              <Image
                src={logoUrl}
                alt={placeName ?? ''}
                fill
                unoptimized
                style={{ objectFit: 'cover' }}
              />
            </Box>
          )}
          {placeName && (
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
              {placeName}
            </Typography>
          )}
          {!logoUrl && !placeName && <Box />}
        </Box>

        {/* Right side: language switcher + ontooff branding */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              borderRadius: 1.5,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              '& .MuiIconButton-root': {
                color: 'text.secondary',
                '&:hover': { bgcolor: 'action.hover' },
              },
            }}
          >
            <LanguageSwitcher />
          </Box>

          <Divider orientation="vertical" flexItem sx={{ height: 24, alignSelf: 'center' }} />

          {/* ontooff logo */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              opacity: 0.65,
              '&:hover': { opacity: 1 },
              transition: 'opacity 0.2s',
            }}
          >
            <Box sx={{ position: 'relative', width: 22, height: 22, flexShrink: 0 }}>
              <Image
                src="/assets/images/logo.svg"
                alt="ontooff"
                fill
                unoptimized
                style={{ objectFit: 'contain' }}
              />
            </Box>
            <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 0.3, color: '#2d5a27', lineHeight: 1 }}>
              ontooff
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

