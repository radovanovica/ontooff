import { Box, Card, CardContent, Grid, Typography, Paper } from '@mui/material';
import {
  People,
  Place,
  EventNote,
  AttachMoney,
} from '@mui/icons-material';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTranslation } from '@/i18n/server';
import { prisma } from '@/lib/prisma';

export const metadata = { title: 'Admin Dashboard — ontooff' };

async function getStats() {
  const [totalUsers, totalPlaces, totalRegistrations, pendingRegistrations, revenue] =
    await Promise.all([
      prisma.user.count(),
      prisma.place.count(),
      prisma.registration.count(),
      prisma.registration.count({ where: { status: 'PENDING' } }),
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
    totalRevenue: revenue._sum.totalAmount ?? 0,
  };
}

const STAT_CARDS = [
  { key: 'totalUsers', icon: People, color: '#1976d2' },
  { key: 'totalPlaces', icon: Place, color: '#2d5a27' },
  { key: 'totalRegistrations', icon: EventNote, color: '#8b5e3c' },
  { key: 'pendingRegistrations', icon: EventNote, color: '#f57c00' },
] as const;

export default async function AdminDashboardPage() {
  const { t } = await getTranslation('en', 'admin');
  const stats = await getStats();

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        {t('dashboard.title')}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        {t('dashboard.subtitle')}
      </Typography>

      <Grid container spacing={3} sx={{ mb: 5 }}>
        {STAT_CARDS.map(({ key, icon: Icon, color }) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={key}>
            <Card elevation={2} sx={{ borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      {t(`dashboard.stats.${key}`)}
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {key === 'totalRevenue'
                        ? `€${Number(stats[key as keyof typeof stats]).toLocaleString()}`
                        : stats[key as keyof typeof stats]}
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
          </Grid>
        ))}
        {/* Revenue card */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={2} sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    {t('dashboard.stats.totalRevenue')}
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    €{Number(stats.totalRevenue).toLocaleString()}
                  </Typography>
                </Box>
                <Box sx={{ width: 52, height: 52, borderRadius: 2, bgcolor: '#2e7d3220', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AttachMoney sx={{ color: '#2e7d32', fontSize: 28 }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
