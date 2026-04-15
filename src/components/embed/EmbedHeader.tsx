'use client';

import { Box, Typography } from '@mui/material';
import Image from 'next/image';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';

interface EmbedHeaderProps {
  placeName: string | null;
  logoUrl: string | null;
}

export default function EmbedHeader({ placeName, logoUrl }: EmbedHeaderProps) {
  if (!placeName && !logoUrl) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        mb: 2.5,
        px: 1,
      }}
    >
      {/* Logo + place name */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {logoUrl && (
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
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
      </Box>

      {/* Language switcher */}
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
    </Box>
  );
}
