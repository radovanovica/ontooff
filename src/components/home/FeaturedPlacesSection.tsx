'use client';

import {
  Box,
  Container,
  Typography,
  IconButton,
  Chip,
  Skeleton,
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Star,
  WorkspacePremium,
} from '@mui/icons-material';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '@/i18n/client';

interface FeaturedPlace {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  country: string | null;
  coverUrl: string | null;
  logoUrl: string | null;
  status: 'RECOMMENDED' | 'PREMIUM';
  activityTypes: { name: string; icon: string | null; color: string | null }[];
}

const STATUS_CONFIG = {
  PREMIUM: {
    label: 'Premium',
    icon: WorkspacePremium,
    color: '#b8860b',
    bg: 'rgba(184,134,11,0.92)',
  },
  RECOMMENDED: {
    label: 'Recommended',
    icon: Star,
    color: '#2d5a27',
    bg: 'rgba(45,90,39,0.88)',
  },
} as const;

function PlaceCard({ place }: { place: FeaturedPlace }) {
  const cfg = STATUS_CONFIG[place.status];
  const Icon = cfg.icon;
  const locationStr = [place.city, place.country].filter(Boolean).join(', ');

  return (
    <Link href={`/places/${place.slug}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
      <Box
        sx={{
          width: { xs: 260, sm: 280 },
          bgcolor: 'background.paper',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'box-shadow 0.2s, transform 0.2s',
          '&:hover': {
            boxShadow: '0 8px 28px rgba(0,0,0,0.13)',
            transform: 'translateY(-3px)',
          },
        }}
      >
        {/* Cover image */}
        <Box
          sx={{
            position: 'relative',
            height: 180,
            bgcolor: '#e8f0e7',
            overflow: 'hidden',
          }}
        >
          {place.coverUrl ? (
            <Image
              src={place.coverUrl}
              alt={place.name}
              fill
              unoptimized
              sizes="(max-width:600px) 260px, 280px"
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <Box
              sx={{
                height: '100%',
                background: 'linear-gradient(135deg, #2d5a27 0%, #4a7c59 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {place.logoUrl && (
                <Box sx={{ position: 'relative', width: 64, height: 64 }}>
                  <Image src={place.logoUrl} alt={place.name} fill unoptimized style={{ objectFit: 'contain' }} />
                </Box>
              )}
            </Box>
          )}

          {/* Status badge */}
          <Box
            sx={{
              position: 'absolute',
              top: 10,
              left: 10,
              bgcolor: cfg.bg,
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: 0.4,
              px: 1,
              py: 0.4,
              borderRadius: 1,
              backdropFilter: 'blur(4px)',
            }}
          >
            <Icon sx={{ fontSize: 13 }} />
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.68rem', lineHeight: 1 }}>
              {cfg.label}
            </Typography>
          </Box>
        </Box>

        {/* Card content */}
        <Box sx={{ p: 2 }}>
          {locationStr && (
            <Typography variant="caption" sx={{ color: cfg.color, fontWeight: 600, display: 'block', mb: 0.25 }}>
              {locationStr}
            </Typography>
          )}
          <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
            {place.name}
          </Typography>
          {place.activityTypes.length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
              {place.activityTypes.map((at) => (
                <Chip
                  key={at.name}
                  label={at.name}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    bgcolor: at.color ?? '#2d5a27',
                    color: 'white',
                  }}
                />
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </Link>
  );
}

export default function FeaturedPlacesSection() {
  const { t } = useTranslation('common');
  const [places, setPlaces] = useState<FeaturedPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/places/featured')
      .then((r) => r.json())
      .then((d) => setPlaces(d.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const scroll = (dir: 'left' | 'right') => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' });
    }
  };

  // Don't render section if there are no featured places (and loading is done)
  if (!loading && places.length === 0) return null;

  return (
    <Box sx={{ py: { xs: 7, md: 10 }, bgcolor: 'background.default' }}>
      <Container maxWidth="lg">
        {/* Section header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', mb: 4 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              <Box component="span" sx={{ color: 'text.primary' }}>
                {t('home.featured.titleBold', 'Featured')}
              </Box>{' '}
              <Box component="span" sx={{ color: 'text.secondary', fontWeight: 400 }}>
                {t('home.featured.titleLight', 'locations')}
              </Box>
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {t('home.featured.subtitle', 'Handpicked premium and recommended places.')}
            </Typography>
          </Box>

          {/* Scroll arrows */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton
              onClick={() => scroll('left')}
              size="small"
              sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, color: 'text.secondary' }}
            >
              <ChevronLeft />
            </IconButton>
            <IconButton
              onClick={() => scroll('right')}
              size="small"
              sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, color: 'text.secondary' }}
            >
              <ChevronRight />
            </IconButton>
          </Box>
        </Box>

        {/* Carousel track */}
        <Box
          ref={scrollRef}
          sx={{
            display: 'flex',
            gap: 2.5,
            overflowX: 'auto',
            pb: 1,
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Box key={i} sx={{ flexShrink: 0, width: { xs: 260, sm: 280 } }}>
                  <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 2 }} />
                  <Skeleton variant="text" sx={{ mt: 1 }} />
                  <Skeleton variant="text" width="60%" />
                </Box>
              ))
            : places.map((place) => (
                <PlaceCard key={place.id} place={place} />
              ))}
        </Box>
      </Container>
    </Box>
  );
}
