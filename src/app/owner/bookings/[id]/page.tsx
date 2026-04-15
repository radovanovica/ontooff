import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { Box, Button, Card, CardContent, Chip, Divider, Grid, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { format } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { RegistrationStatus, UserRole } from '@/types';
import BookingDecisionActions from './_components/BookingDecisionActions';
import ApprovalBanner from './_components/ApprovalBanner';
import { getTranslation } from '@/i18n/server';
import { defaultLocale } from '@/i18n/config';

type Props = {
  params: Promise<{ id: string }>;
};

const STATUS_COLOR: Record<RegistrationStatus, 'default' | 'warning' | 'info' | 'success' | 'error'> = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  CANCELLED: 'error',
  COMPLETED: 'default',
  NO_SHOW: 'default',
};

function formatDate(value: Date | null | undefined): string {
  if (!value) return '—';
  return format(new Date(value), 'dd MMM yyyy');
}

export default async function OwnerBookingDetailsPage({ params }: Props) {
  const { t } = await getTranslation(defaultLocale, 'owner');
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin?callbackUrl=/owner/bookings');
  }

  const { id } = await params;

  const booking = await prisma.registration.findUnique({
    where: { id },
    include: {
      activityLocation: {
        include: {
          place: { select: { id: true, name: true, ownerId: true } },
          activityTypes: { include: { activityType: { select: { id: true, name: true } } } },
        },
      },
      registrationSpots: {
        include: {
          spot: { select: { id: true, name: true, code: true } },
        },
      },
      pricingRule: { select: { id: true, name: true, currency: true } },
      paymentBreakdown: { orderBy: { sortOrder: 'asc' } },
    },
  });

  if (!booking) {
    notFound();
  }

  const canAccess =
    session.user.role === UserRole.SUPER_ADMIN
    || (session.user.role === UserRole.PLACE_OWNER && booking.activityLocation.place.ownerId === session.user.id);

  if (!canAccess) {
    notFound();
  }

  const currency = booking.pricingRule?.currency ?? 'RSD';
  const spots = booking.registrationSpots.map((entry) =>
    entry.spot.code ? `${entry.spot.name} (${entry.spot.code})` : entry.spot.name
  );
  const guestCounts = booking.guestCounts as Record<string, number>;

  return (
    <Box>
      <ApprovalBanner />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1.5 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {t('bookings.details.titleWithNumber', { number: booking.registrationNumber })}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {booking.activityLocation.place.name} — {booking.activityLocation.name}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <BookingDecisionActions bookingId={booking.id} currentStatus={booking.status} />
          <Link href="/owner/bookings" style={{ textDecoration: 'none' }}>
            <Button variant="outlined" startIcon={<ArrowBackIcon />}>
              {t('bookings.actions.backToBookings')}
            </Button>
          </Link>
        </Box>
      </Box>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                {t('bookings.details.sectionDetails')}
              </Typography>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">{t('bookings.details.guest')}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {booking.firstName} {booking.lastName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">{booking.email}</Typography>
                  {booking.phone && <Typography variant="body2" color="text.secondary">{booking.phone}</Typography>}
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">{t('bookings.table.status')}</Typography>
                  <Box>
                    <Chip label={booking.status} color={STATUS_COLOR[booking.status]} size="small" />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    {t('bookings.table.created')}
                  </Typography>
                  <Typography variant="body2">{formatDate(booking.createdAt)}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">{t('bookings.table.dates')}</Typography>
                  <Typography variant="body2">
                    {formatDate(booking.startDate)} → {formatDate(booking.endDate)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('bookings.details.numberOfDays', { count: booking.numberOfDays })}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">{t('bookings.details.activity')}</Typography>
                  <Typography variant="body2">{booking.activityLocation.activityTypes.map((a: { activityType: { name: string } }) => a.activityType.name).join(', ') || t('bookings.table.empty')}</Typography>
                  <Typography variant="body2" color="text.secondary">{booking.activityLocation.name}</Typography>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" color="text.secondary">{t('bookings.details.spots')}</Typography>
                  <Typography variant="body2">{spots.length > 0 ? spots.join(', ') : t('bookings.details.noSpotSelected')}</Typography>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" color="text.secondary">{t('bookings.details.guestCounts')}</Typography>
                  <Typography variant="body2">
                    {Object.entries(guestCounts)
                      .filter(([, value]) => Number(value) > 0)
                      .map(([key, value]) => `${key}: ${value}`)
                      .join(', ') || t('bookings.table.empty')}
                  </Typography>
                </Grid>
                {booking.notes && (
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="caption" color="text.secondary">{t('bookings.details.notes')}</Typography>
                    <Typography variant="body2">{booking.notes}</Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                {t('bookings.details.paymentSummary')}
              </Typography>

              {booking.paymentBreakdown.length > 0 ? (
                <>
                  {booking.paymentBreakdown.map((item) => (
                    <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                      <Typography variant="body2">{item.label}</Typography>
                      <Typography variant="body2">
                        {currency} {Number(item.totalPrice).toFixed(2)}
                      </Typography>
                    </Box>
                  ))}
                  <Divider sx={{ my: 1.25 }} />
                </>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {t('bookings.details.noBreakdown')}
                </Typography>
              )}

              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2">{t('bookings.details.total')}</Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {booking.totalAmount != null ? `${currency} ${Number(booking.totalAmount).toFixed(2)}` : t('bookings.table.empty')}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
