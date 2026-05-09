'use client';

import {
  Box,
  Container,
  Typography,
  IconButton,
  Chip,
  Skeleton,
  Button,
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Star,
  WorkspacePremium,
  LocationOn,
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

function PlaceCard({ place }: { place: FeaturedPlace }) {
  const { t } = useTranslation('common');
  const isPremium = place.status === 'PREMIUM';
  const locationStr = [place.city, place.country].filter(Boolean).join(', ');
  const badgeLabel = isPremium
    ? t('home.featured.badgePremium')
    : t('home.featured.badgeRecommended');

  return (
    <Link href={`/places/${place.slug}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
      <Box
        sx={{
          width: { xs: 240, sm: 260 },
          bgcolor: 'background.paper',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'box-shadow 0.2s, transform 0.2s',
          '&:hover': {
            boxShadow: '0 6px 24px rgba(0,0,0,0.10)',
            transform: 'translateY(-2px)',
          },
        }}
      >
        {/* Cover image */}
        <Box sx={{ position: 'relative', height: 165, bgcolor: '#e8f0e7', overflow: 'hidden' }}>
          {place.coverUrl ? (
            <Image
              src={place.coverUrl}
              alt={place.name}
              fill
              unoptimized
              sizes="(max-width:600px) 240px, 260px"
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <Box
              sx={{
                height: '100%',
                bgcolor: isPremium ? '#4a3800' : '#1a3a18',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {place.logoUrl && (
                <Box sx={{ position: 'relative', width: 56, height: 56 }}>
                  <Image src={place.logoUrl} alt={place.name} fill unoptimized style={{ objectFit: 'contain' }} />
                </Box>
              )}
            </Box>
          )}

          {/* Status badge */}
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              left: 8,
              bgcolor: isPremium ? 'rgba(120,88,0,0.90)' : 'rgba(45,90,39,0.90)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1,
              py: 0.35,
              borderRadius: 1,
            }}
          >
            {isPremium
              ? <WorkspacePremium sx={{ fontSize: 12 }} />
              : <Star sx={{ fontSize: 12 }} />}
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.65rem', lineHeight: 1 }}>
              {badgeLabel}
            </Typography>
          </Box>
        </Box>

        {/* Card content */}
        <Box sx={{ p: 1.75 }}>
          {locationStr && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, mb: 0.25 }}>
              <LocationOn sx={{ fontSize: 12, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, lineHeight: 1 }}>
                {locationStr}
              </Typography>
            </Box>
          )}
          <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.35, color: 'text.primary' }}>
            {place.name}
          </Typography>
          {place.activityTypes.length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
              {place.activityTypes.slice(0, 3).map((at) => (
                <Chip
                  key={at.name}
                  label={at.name}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.6rem',
                    fontWeight: 600,
                    bgcolor: (at.color ?? '#2d5a27') + '18',
                    color: at.color ?? '#2d5a27',
                    border: '1px solid',
                    borderColor: (at.color ?? '#2d5a27') + '30',
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
      scrollRef.current.scrollBy({ left: dir === 'left' ? -280 : 280, behavior: 'smooth' });
    }
  };

  if (!loading && places.length === 0) return null;

  return (
    <Box sx={{ bgcolor: 'background.default', py: { xs: 7, md: 10 } }}>
      <Container maxWidth="lg">
        {/* Section header — matches blog/latestBlog style */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 5 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Star sx={{ color: '#2d5a27', fontSize: 28 }} />
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {t('home.featured.title')}
              </Typography>
            </Box>
            <Typography variant="body1" color="text.secondary">
              {t('home.featured.subtitle')}
            </Typography>
          </Box>

          {/* Scroll arrows */}
          <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
            <IconButton
              onClick={() => scroll('left')}
              size="small"
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                color: 'text.secondary',
                '&:hover': { borderColor: 'text.secondary' },
              }}
            >
              <ChevronLeft />
            </IconButton>
            <IconButton
              onClick={() => scroll('right')}
              size="small"
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                color: 'text.secondary',
                '&:hover': { borderColor: 'text.secondary' },
              }}
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
            gap: 2,
            overflowX: 'auto',
            pb: 1,
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Box key={i} sx={{ flexShrink: 0, width: { xs: 240, sm: 260 } }}>
                  <Skeleton variant="rectangular" height={165} sx={{ borderRadius: 2 }} />
                  <Box sx={{ p: 1.75 }}>
                    <Skeleton variant="text" width="55%" sx={{ mb: 0.5 }} />
                    <Skeleton variant="text" />
                    <Skeleton variant="text" width="70%" />
                  </Box>
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
