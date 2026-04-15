import { Box, Card, CardContent, Grid, Typography, Button, Chip } from '@mui/material';
import {
  People,
  Place,
  EventNote,
  AttachMoney,
  Business,
  HourglassEmpty,
  Public,
} from '@mui/icons-material';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTranslation } from '@/i18n/server';
import { prisma } from '@/lib/prisma';

export const metadata = { title: 'Admin Dashboard — ontooff' };

async function getStats() {
  const [
    totalUsers,
    totalPlaces,
    totalRegistrations,
    pendingRegistrations,
    pendingOrgs,
    totalOrgs,
    freeLocations,
    revenue,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.place.count(),
    prisma.registration.count(),
    prisma.registration.count({ where: { status: 'PENDING' } }),
    prisma.organization.count({ where: { status: 'PENDING' } }),
    prisma.organization.count(),
    prisma.freeLocation.count(),
    prisma.registration.aggregate({
      _sum: { totalAmount: true },
      where: { paymentStatus: 'PAID' },
    }),
  ]);
  return {
    totalUsers,
    totalPlaces,
    totalRegistrations,
    pendingRegistrations,
    pendingOrgs,
    totalOrgs,
    freeLocations,
    totalRevenue: Number(revenue._sum.totalAmount ?? 0),
  };
}

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);
  void session;
  const { t } = await getTranslation('en', 'admin');
  const stats = await getStats();

  const statCards = [
    { label: t('dashboard.stats.totalUsers'), value: stats.totalUsers, icon: People, color: '#1976d2', href: '/admin/users' },
    { label: t('dashboard.stats.totalPlaces'), value: stats.totalPlaces, icon: Place, color: '#2d5a27', href: '/admin/places' },
    { label: t('dashboard.stats.totalRegistrations'), value: stats.totalRegistrations, icon: EventNote, color: '#8b5e3c', href: '/admin/registrations' },
    { label: t('dashboard.stats.pendingRegistrations'), value: stats.pendingRegistrations, icon: HourglassEmpty, color: '#f57c00', href: '/admin/registrations' },
    { label: t('dashboard.stats.totalOrgs', 'Organizations'), value: stats.totalOrgs, icon: Business, color: '#7b1fa2', href: '/admin/organizations' },
    { label: t('dashboard.stats.pendingOrgs', 'Pending Orgs'), value: stats.pendingOrgs, icon: HourglassEmpty, color: '#c0392b', href: '/admin/organizations?status=PENDING' },
    { label: t('dashboard.stats.freeLocations'), value: stats.freeLocations, icon: Public, color: '#7b3f00', href: '/admin/free-locations' },
    { label: t('dashboard.stats.totalRevenue'), value: `€${Number(stats.totalRevenue).toLocaleString()}`, icon: AttachMoney, color: '#2e7d32', href: '/admin/registrations' },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
            {t('dashboard.title')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('dashboard.subtitle')}
          </Typography>
        </Box>
        {stats.pendingOrgs > 0 && (
          <Link href="/admin/organizations?status=PENDING" style={{ textDecoration: 'none' }}>
            <Button
              variant="contained"
              color="error"
              startIcon={<HourglassEmpty />}
              size="small"
            >
              {t('dashboard.pendingOrgsButton', { count: stats.pendingOrgs })}
            </Button>
          </Link>
        )}
      </Box>

      <Grid container spacing={3}>
        {statCards.map(({ label, value, icon: Icon, color, href }) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={label}>
            <Link href={href} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
            <Card
              elevation={2}
              sx={{
                borderRadius: 2,
                transition: 'box-shadow 0.2s',
                '&:hover': { boxShadow: 6 },
                cursor: 'pointer',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      {label}
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {value}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 52,
                      height: 52,
                      borderRadius: 2,
                      bgcolor: color + '20',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon sx={{ color, fontSize: 28 }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
            </Link>
          </Grid>
        ))}
      </Grid>

      {/* Quick Links */}
      <Box sx={{ mt: 5 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          {t('dashboard.quickLinks')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Link href="/admin/organizations" style={{ textDecoration: 'none' }}>
            <Button variant="outlined" startIcon={<Business />}>{t('organizations.title', 'Organizations')}</Button>
          </Link>
          <Link href="/admin/users" style={{ textDecoration: 'none' }}>
            <Button variant="outlined" startIcon={<People />}>{t('users.title')}</Button>
          </Link>
          <Link href="/admin/places" style={{ textDecoration: 'none' }}>
            <Button variant="outlined" startIcon={<Place />}>{t('places.title')}</Button>
          </Link>
          <Link href="/admin/registrations" style={{ textDecoration: 'none' }}>
            <Button variant="outlined" startIcon={<EventNote />}>{t('registrations.title')}</Button>
          </Link>
        </Box>
      </Box>
    </Box>
  );
}
