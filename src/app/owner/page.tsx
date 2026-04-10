import { Box, Card, CardContent, Grid, Typography, Button } from '@mui/material';
import { Place, EventNote, Pending, AttachMoney } from '@mui/icons-material';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTranslation } from '@/i18n/server';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export const metadata = { title: 'Owner Dashboard — ontooff' };

async function getOwnerStats(ownerId: string) {
  const places = await prisma.place.findMany({
    where: { ownerId },
    select: { id: true },
  });
  const placeIds = places.map((p) => p.id);

  const locations = await prisma.activityLocation.findMany({
    where: { placeId: { in: placeIds } },
    select: { id: true },
  });
  const locationIds = locations.map((l) => l.id);

  const [totalRegistrations, pendingRegistrations, revenue] = await Promise.all([
    prisma.registration.count({ where: { activityLocationId: { in: locationIds } } }),
    prisma.registration.count({
      where: { activityLocationId: { in: locationIds }, status: 'PENDING' },
    }),
    prisma.registration.aggregate({
      _sum: { totalAmount: true },
      where: { activityLocationId: { in: locationIds }, paymentStatus: 'PAID' },
    }),
  ]);

  return {
    totalPlaces: placeIds.length,
    totalLocations: locationIds.length,
    totalRegistrations,
    pendingRegistrations,
    totalRevenue: revenue._sum.totalAmount ?? 0,
  };
}

export default async function OwnerDashboardPage() {
  const session = await getServerSession(authOptions);
  const { t } = await getTranslation('en', 'owner');
  const stats = await getOwnerStats(session!.user.id);

  const cards = [
    { label: t('dashboard.stats.totalPlaces'), value: stats.totalPlaces, icon: Place, color: '#2d5a27' },
    { label: t('dashboard.stats.totalLocations'), value: stats.totalLocations, icon: Place, color: '#5c8a56' },
    { label: t('dashboard.stats.pendingBookings'), value: stats.pendingRegistrations, icon: Pending, color: '#f57c00' },
    { label: t('dashboard.stats.totalRevenue'), value: `€${Number(stats.totalRevenue).toLocaleString()}`, icon: AttachMoney, color: '#1976d2' },
  ] as const;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
            {t('dashboard.title')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('dashboard.subtitle')}
          </Typography>
        </Box>
        <Link href="/owner/places" style={{ textDecoration: 'none' }}>
          <Button variant="contained">
            {t('dashboard.myPlaces')}
          </Button>
        </Link>
      </Box>

      <Grid container spacing={3} sx={{ mb: 5 }}>
        {cards.map((card) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={card.label}>
            <Card elevation={2} sx={{ borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      {card.label}
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {card.value}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 52,
                      height: 52,
                      borderRadius: 2,
                      bgcolor: card.color + '20',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <card.icon sx={{ color: card.color, fontSize: 28 }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Link href="/owner/places" style={{ textDecoration: 'none' }}>
          <Button variant="outlined" startIcon={<Place />}>
            {t('places.title')}
          </Button>
        </Link>
        <Link href="/owner/bookings" style={{ textDecoration: 'none' }}>
          <Button variant="outlined" startIcon={<EventNote />}>
            {t('bookings.title')}
          </Button>
        </Link>
      </Box>
    </Box>
  );
}
