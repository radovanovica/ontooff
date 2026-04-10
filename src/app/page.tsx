import {
  Box,
  Button,
  Container,
  Grid,
  Typography,
  Card,
  CardContent,
} from '@mui/material';
import { NaturePeople, EventNote, Map, Security } from '@mui/icons-material';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { getTranslation } from '@/i18n/server';

export const metadata = {
  title: 'ontooff — Book Outdoor Activities',
  description: 'Find and book camping, fishing, kayaking and more outdoor activities.',
};

const FEATURES = [
  {
    icon: Map,
    titleKey: 'home.features.map.title',
    descKey: 'home.features.map.desc',
    color: '#2d5a27',
  },
  {
    icon: EventNote,
    titleKey: 'home.features.booking.title',
    descKey: 'home.features.booking.desc',
    color: '#8b5e3c',
  },
  {
    icon: Security,
    titleKey: 'home.features.secure.title',
    descKey: 'home.features.secure.desc',
    color: '#1565c0',
  },
  {
    icon: NaturePeople,
    titleKey: 'home.features.activities.title',
    descKey: 'home.features.activities.desc',
    color: '#5c4e3c',
  },
];

export default async function HomePage() {
  const { t } = await getTranslation('en', 'common');

  return (
    <>
      <Navbar />

      {/* Hero */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #1a3d17 0%, #2d5a27 50%, #3d7a36 100%)',
          color: 'white',
          py: { xs: 10, md: 16 },
          textAlign: 'center',
          px: 2,
        }}
      >
        <Container maxWidth="md">
          <Typography variant="h2" sx={{ fontWeight: 800, mb: 2, lineHeight: 1.2 }}>
            {t('home.heroTitle')}
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.85, mb: 5, fontWeight: 400 }}>
            {t('home.heroSubtitle')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/auth/signup" style={{ textDecoration: 'none' }}>
              <Button
                variant="contained"
                size="large"
                sx={{
                  bgcolor: 'white',
                  color: 'primary.dark',
                  fontWeight: 700,
                  px: 4,
                  '&:hover': { bgcolor: 'grey.100' },
                }}
              >
                {t('home.getStarted')}
              </Button>
            </Link>
            <Link href="/auth/signin" style={{ textDecoration: 'none' }}>
              <Button
                variant="outlined"
                size="large"
                sx={{ borderColor: 'rgba(255,255,255,0.6)', color: 'white', px: 4 }}
              >
                {t('auth.signIn')}
              </Button>
            </Link>
          </Box>
        </Container>
      </Box>

      {/* Features */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <Typography
          variant="h4"
          sx={{ fontWeight: 700, textAlign: 'center', mb: 2 }}
        >
          {t('home.featuresTitle')}
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ textAlign: 'center', mb: 8, maxWidth: 560, mx: 'auto' }}
        >
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
                  transition: 'box-shadow 0.2s, transform 0.2s',
                  '&:hover': { boxShadow: 4, transform: 'translateY(-4px)' },
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

      {/* CTA */}
      <Box sx={{ bgcolor: 'background.paper', py: { xs: 8, md: 10 }, textAlign: 'center', borderTop: '1px solid', borderColor: 'divider' }}>
        <Container maxWidth="sm">
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
            {t('home.ctaTitle')}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            {t('home.ctaSubtitle')}
          </Typography>
          <Link href="/auth/signup" style={{ textDecoration: 'none' }}>
            <Button variant="contained" size="large" sx={{ px: 6 }}>
              {t('home.getStarted')}
            </Button>
          </Link>
        </Container>
      </Box>
    </>
  );
}
