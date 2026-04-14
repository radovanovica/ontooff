'use client';

import {
  Box,
  Button,
  Container,
  Grid,
  Typography,
  Card,
  CardContent,
  Chip,
  Stack,
  Paper,
} from '@mui/material';
import {
  NaturePeople,
  EventNote,
  Map,
  Security,
  SearchOutlined,
  PinDrop,
  CheckCircleOutlined,
  Business,
} from '@mui/icons-material';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/layout/Navbar';
import DateRangePicker from '@/components/ui/DateRangePicker';
import { useTranslation } from '@/i18n/client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { ActivityTag } from '@/types';

const STATS = [
  { value: '50+', key: 'locations' },
  { value: '2 000+', key: 'bookings' },
  { value: '10+', key: 'activities' },
  { value: '4.9★', key: 'rating' },
];

const HOW_IT_WORKS = [
  { icon: SearchOutlined, step: '01', titleKey: 'home.steps.find.title', descKey: 'home.steps.find.desc', color: '#2d5a27' },
  { icon: PinDrop,        step: '02', titleKey: 'home.steps.pick.title', descKey: 'home.steps.pick.desc', color: '#8b5e3c' },
  { icon: CheckCircleOutlined, step: '03', titleKey: 'home.steps.book.title', descKey: 'home.steps.book.desc', color: '#1565c0' },
];

const FEATURES = [
  { icon: Map,           titleKey: 'home.features.map.title',        descKey: 'home.features.map.desc',        color: '#2d5a27' },
  { icon: EventNote,     titleKey: 'home.features.booking.title',    descKey: 'home.features.booking.desc',    color: '#8b5e3c' },
  { icon: Security,      titleKey: 'home.features.secure.title',     descKey: 'home.features.secure.desc',     color: '#1565c0' },
  { icon: NaturePeople,  titleKey: 'home.features.activities.title', descKey: 'home.features.activities.desc', color: '#5c4e3c' },
];

export default function HomePage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [tags, setTags] = useState<ActivityTag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    fetch('/api/tags')
      .then((r) => r.json())
      .then((d) => setTags(d.data ?? []))
      .catch(() => {});
  }, []);

  const toggleTag = (slug: string) => {
    setSelectedTags((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (selectedTags.length) params.set('tags', selectedTags.join(','));
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);
    router.push(`/search?${params.toString()}`);
  };

  return (
    <>
      <Navbar />

      {/* ── HERO ── */}
      <Box
        sx={{
          position: 'relative',
          minHeight: { xs: '90vh', md: '95vh' },
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Background image */}
        <Image
          src="/assets/images/hero-1.jpg"
          alt="Outdoor nature"
          fill
          priority
          unoptimized
          sizes="100vw"
          style={{ objectFit: 'cover', objectPosition: 'center' }}
        />
        {/* Dark overlay */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(10,30,10,0.78) 0%, rgba(20,50,20,0.58) 60%, rgba(10,30,10,0.68) 100%)',
          }}
        />

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, py: { xs: 8, md: 4 } }}>
          <Grid container spacing={4} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Typography
                variant="h1"
                sx={{
                  fontWeight: 900,
                  color: 'white',
                  fontSize: { xs: '2.4rem', sm: '3.2rem', md: '4rem' },
                  lineHeight: 1.1,
                  mb: 2,
                  textShadow: '0 2px 20px rgba(0,0,0,0.4)',
                }}
              >
                {t('home.heroTitle')}
              </Typography>

              <Typography
                variant="h6"
                sx={{
                  color: 'rgba(255,255,255,0.88)',
                  fontWeight: 400,
                  mb: 4,
                  maxWidth: 520,
                  lineHeight: 1.6,
                }}
              >
                {t('home.heroSubtitle')}
              </Typography>

              {/* ── SEARCH WIDGET ── */}
              <Paper
                elevation={8}
                sx={{
                  borderRadius: 3,
                  p: { xs: 2.5, sm: 3 },
                  bgcolor: 'rgba(255,255,255,0.97)',
                  backdropFilter: 'blur(12px)',
                  mb: 3,
                  maxWidth: 560,
                }}
              >
                {/* Tag chips */}
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, mb: 1, display: 'block' }}>
                  {t('home.search.selectActivity', 'Select Activity')}
                </Typography>
                <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75, mb: 2.5 }}>
                  {tags.map((tag) => {
                    const active = selectedTags.includes(tag.slug);
                    return (
                      <Chip
                        key={tag.slug}
                        label={`${tag.icon ?? ''} ${t(`tags.${tag.slug}`, tag.name)}`}
                        size="small"
                        onClick={() => toggleTag(tag.slug)}
                        sx={{
                          cursor: 'pointer',
                          fontWeight: 500,
                          bgcolor: active ? (tag.color ?? '#2d5a27') : 'transparent',
                          color: active ? 'white' : 'text.primary',
                          border: `1.5px solid ${active ? (tag.color ?? '#2d5a27') : '#ddd'}`,
                          '&:hover': {
                            bgcolor: active ? (tag.color ?? '#2d5a27') : `${tag.color ?? '#2d5a27'}15`,
                          },
                        }}
                      />
                    );
                  })}
                </Stack>

                {/* Date range */}
                <Box sx={{ mb: 2 }}>
                  <DateRangePicker
                    inline
                    fromValue={dateFrom}
                    toValue={dateTo}
                    onFromChange={(v) => {
                      setDateFrom(v);
                      if (dateTo && v && v >= dateTo) setDateTo('');
                    }}
                    onToChange={setDateTo}
                  />
                </Box>

                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  onClick={handleSearch}
                  startIcon={<SearchOutlined />}
                  sx={{
                    bgcolor: '#2d5a27',
                    fontWeight: 700,
                    py: 1.4,
                    borderRadius: 2,
                    '&:hover': { bgcolor: '#1e3d1a' },
                  }}
                >
                  {t('home.search.button', 'Search Activities')}
                </Button>
              </Paper>

              {/* Register org link */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Business sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 18 }} />
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)' }}>
                  {t('home.orgCta', 'Are you a business owner?')}{' '}
                  <Link href="/auth/register-org" style={{ color: '#7ec86e', fontWeight: 600, textDecoration: 'none' }}>
                    {t('home.orgCtaLink', 'Register your organization →')}
                  </Link>
                </Typography>
              </Box>
            </Grid>

            {/* Hero side image card */}
            <Grid size={{ xs: 12, md: 5 }} sx={{ display: { xs: 'none', md: 'block' } }}>
              <Box
                sx={{
                  borderRadius: 4,
                  overflow: 'hidden',
                  boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
                  aspectRatio: '4/3',
                  position: 'relative',
                }}
              >
                <Image
                  src="/assets/images/hero-2.jpg"
                  alt="Camping by the lake"
                  fill
                  unoptimized
                  sizes="(max-width: 900px) 100vw, 42vw"
                  style={{ objectFit: 'cover' }}
                />
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ── STATS BAR ── */}
      <Box sx={{ bgcolor: '#1a3d17', color: 'white', py: 4 }}>
        <Container maxWidth="lg">
          <Typography
            variant="body2"
            sx={{ textAlign: 'center', opacity: 0.7, mb: 3, letterSpacing: 1, textTransform: 'uppercase', fontSize: '0.75rem' }}
          >
            {t('home.statsTitle')}
          </Typography>
          <Grid container spacing={2} sx={{ justifyContent: 'center' }}>
            {STATS.map((s) => (
              <Grid size={{ xs: 6, sm: 3 }} key={s.key}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#7ec86e' }}>
                    {s.value}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
                    {t(`home.stats.${s.key}`)}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── HOW IT WORKS ── */}
      <Box sx={{ bgcolor: '#f8f9f6', py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Typography variant="h4" sx={{ fontWeight: 700, textAlign: 'center', mb: 1 }}>
            {t('home.howItWorksTitle')}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', mb: 8, maxWidth: 480, mx: 'auto' }}>
            {t('home.howItWorksSubtitle')}
          </Typography>

          <Grid container spacing={4}>
            {HOW_IT_WORKS.map((step) => (
              <Grid size={{ xs: 12, md: 4 }} key={step.step}>
                <Box sx={{ textAlign: 'center', px: 2 }}>
                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      bgcolor: step.color + '18',
                      border: `2px solid ${step.color}30`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 2.5,
                      position: 'relative',
                    }}
                  >
                    <step.icon sx={{ color: step.color, fontSize: 36 }} />
                    <Box
                      sx={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        bgcolor: step.color,
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.65rem',
                        fontWeight: 800,
                      }}
                    >
                      {step.step}
                    </Box>
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                    {t(step.titleKey)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    {t(step.descKey)}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── PHOTO GALLERY / SHOWCASE ── */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <Typography variant="h4" sx={{ fontWeight: 700, textAlign: 'center', mb: 1 }}>
          {t('home.galleryTitle')}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', mb: 6, maxWidth: 500, mx: 'auto' }}>
          {t('home.gallerySubtitle')}
        </Typography>

        <Grid container spacing={3}>
          {/* Large featured image */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Box
              sx={{
                borderRadius: 4,
                overflow: 'hidden',
                height: { xs: 240, md: 420 },
                position: 'relative',
                boxShadow: 3,
                '&:hover img': { transform: 'scale(1.04)' },
              }}
            >
              <Image
                src="/assets/images/image-2.jpg"
                alt="Nature outdoor"
                fill
                unoptimized
                sizes="(max-width: 900px) 100vw, 58vw"
                style={{ objectFit: 'cover', transition: 'transform 0.4s ease' }}
              />
            </Box>
          </Grid>

          {/* Two stacked images */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Stack spacing={3} sx={{ height: '100%' }}>
              <Box
                sx={{
                  borderRadius: 4,
                  overflow: 'hidden',
                  flex: 1,
                  minHeight: 190,
                  position: 'relative',
                  boxShadow: 3,
                  '&:hover img': { transform: 'scale(1.04)' },
                }}
              >
                <Image
                  src="/assets/images/ilustation-1.jpg"
                  alt="Activity illustration"
                  fill
                  unoptimized
                  sizes="(max-width: 900px) 100vw, 38vw"
                  style={{ objectFit: 'cover', transition: 'transform 0.4s ease' }}
                />
              </Box>
              <Box
                sx={{
                  borderRadius: 4,
                  overflow: 'hidden',
                  flex: 1,
                  minHeight: 190,
                  position: 'relative',
                  boxShadow: 3,
                  '&:hover img': { transform: 'scale(1.04)' },
                }}
              >
                <Image
                  src="/assets/images/ilustation-2.jpg"
                  alt="Outdoor experience"
                  fill
                  unoptimized
                  sizes="(max-width: 900px) 100vw, 38vw"
                  style={{ objectFit: 'cover', transition: 'transform 0.4s ease' }}
                />
              </Box>
            </Stack>
          </Grid>
        </Grid>
      </Container>

      {/* ── FEATURES ── */}
      <Box sx={{ bgcolor: '#f8f9f6', py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Typography variant="h4" sx={{ fontWeight: 700, textAlign: 'center', mb: 2 }}>
            {t('home.featuresTitle')}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', mb: 8, maxWidth: 560, mx: 'auto' }}>
            {t('home.featuresSubtitle')}
          </Typography>

          <Grid container spacing={4}>
            {FEATURES.map((f) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={f.titleKey}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                    height: '100%',
                    bgcolor: 'white',
                    transition: 'box-shadow 0.2s, transform 0.2s',
                    '&:hover': { boxShadow: 6, transform: 'translateY(-6px)' },
                  }}
                >
                  <CardContent sx={{ textAlign: 'center', p: 4 }}>
                    <Box
                      sx={{
                        width: 64,
                        height: 64,
                        borderRadius: 2,
                        bgcolor: f.color + '15',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 2.5,
                      }}
                    >
                      <f.icon sx={{ color: f.color, fontSize: 32 }} />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                      {t(f.titleKey)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t(f.descKey)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── CTA ── */}
      <Box
        sx={{
          position: 'relative',
          py: { xs: 10, md: 14 },
          textAlign: 'center',
          overflow: 'hidden',
          backgroundImage: 'url(/assets/images/hero-2.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 60%',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(10,30,10,0.82) 0%, rgba(20,60,20,0.72) 100%)',
          },
        }}
      >
        <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
          <Typography variant="h3" sx={{ fontWeight: 800, color: 'white', mb: 2, lineHeight: 1.2 }}>
            {t('home.ctaTitle')}
          </Typography>
          <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.82)', mb: 5, fontWeight: 400 }}>
            {t('home.ctaSubtitle')}
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'center' }}>
            <Link href="/auth/signup" style={{ textDecoration: 'none' }}>
              <Button
                variant="contained"
                size="large"
                sx={{
                  bgcolor: '#3d7a36',
                  color: 'white',
                  px: 5,
                  py: 1.75,
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  borderRadius: 2,
                  boxShadow: '0 4px 24px rgba(45,90,39,0.5)',
                  '&:hover': { bgcolor: '#2d5a27' },
                }}
              >
                {t('home.ctaButton')}
              </Button>
            </Link>
            <Link href="/auth/register-org" style={{ textDecoration: 'none' }}>
              <Button
                variant="outlined"
                size="large"
                startIcon={<Business />}
                sx={{
                  borderColor: 'rgba(255,255,255,0.5)',
                  color: 'white',
                  px: 4,
                  py: 1.75,
                  fontSize: '1rem',
                  fontWeight: 600,
                  borderRadius: 2,
                  backdropFilter: 'blur(4px)',
                  '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' },
                }}
              >
                {t('home.ctaOrgButton', 'Register Organization')}
              </Button>
            </Link>
          </Stack>
        </Container>
      </Box>

      {/* ── FOOTER ── */}
      <Box
        component="footer"
        sx={{
          bgcolor: '#0f2410',
          color: 'rgba(255,255,255,0.6)',
          py: 4,
          textAlign: 'center',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Container>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
            <Image src="/assets/images/logo.svg" alt="ontooff" width={22} height={22} />
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 700 }}>
              ontooff
            </Typography>
          </Box>
          <Typography variant="caption">
            © {new Date().getFullYear()} ontooff. {t('footer.rights')}
          </Typography>
        </Container>
      </Box>
    </>
  );
}
