import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Box, Button, Card, CardContent, Chip, Divider, Grid, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { format } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { RegistrationStatus } from '@/types';
import BookingDecisionActions from '@/app/owner/bookings/[id]/_components/BookingDecisionActions';
import ApprovalBanner from '@/app/owner/bookings/[id]/_components/ApprovalBanner';

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

const PAYMENT_COLOR: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
  UNPAID: 'warning',
  PARTIALLY_PAID: 'warning',
  PAID: 'success',
  REFUNDED: 'info',
  WAIVED: 'default',
};

function formatDate(value: Date | null | undefined): string {
  if (!value) return '—';
  return format(new Date(value), 'dd MMM yyyy');
}

export default async function AdminRegistrationDetailPage({ params }: Props) {
  const { id } = await params;

  const booking = await prisma.registration.findUnique({
    where: { id },
    include: {
      activityLocation: {
        include: {
          place: { select: { id: true, name: true } },
          activityTypes: { include: { activityType: { select: { id: true, name: true } } } },
        },
      },
      registrationSpots: {
        include: { spot: { select: { id: true, name: true, code: true } } },
      },
      pricingRule: { select: { id: true, name: true, currency: true } },
      paymentBreakdown: { orderBy: { sortOrder: 'asc' } },
    },
  });

  if (!booking) {
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
            Booking #{booking.registrationNumber}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {booking.activityLocation.place.name} — {booking.activityLocation.name}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <BookingDecisionActions bookingId={booking.id} currentStatus={booking.status} />
          <Link href="/admin/registrations" style={{ textDecoration: 'none' }}>
            <Button variant="outlined" startIcon={<ArrowBackIcon />}>
              Back to registrations
            </Button>
          </Link>
        </Box>
      </Box>

      <Grid container spacing={2.5}>
        {/* Left: main details */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                Booking Details
              </Typography>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">Guest</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {booking.firstName} {booking.lastName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">{booking.email}</Typography>
                  {booking.phone && (
                    <Typography variant="body2" color="text.secondary">{booking.phone}</Typography>
                  )}
                  {booking.address && (
                    <Typography variant="body2" color="text.secondary">{booking.address}</Typography>
                  )}
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.25 }}>
                    <Chip
                      label={booking.status}
                      color={STATUS_COLOR[booking.status]}
                      size="small"
                    />
                    <Chip
                      label={booking.paymentStatus}
                      color={PAYMENT_COLOR[booking.paymentStatus] ?? 'default'}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Created
                  </Typography>
                  <Typography variant="body2">{formatDate(booking.createdAt)}</Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">Dates</Typography>
                  <Typography variant="body2">
                    {formatDate(booking.startDate)} → {formatDate(booking.endDate)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {booking.numberOfDays} {booking.numberOfDays === 1 ? 'day' : 'days'}
                  </Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">Activity</Typography>
                  <Typography variant="body2">
                    {booking.activityLocation.activityTypes
                      .map((a: { activityType: { name: string } }) => a.activityType.name)
                      .join(', ') || '—'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {booking.activityLocation.name}
                  </Typography>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" color="text.secondary">Spots</Typography>
                  <Typography variant="body2">
                    {spots.length > 0 ? spots.join(', ') : 'No spot selected'}
                  </Typography>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" color="text.secondary">Guest counts</Typography>
                  <Typography variant="body2">
                    {Object.entries(guestCounts)
                      .filter(([, value]) => Number(value) > 0)
                      .map(([key, value]) => `${key}: ${value}`)
                      .join(', ') || '—'}
                  </Typography>
                </Grid>

                {booking.paymentMethod && (
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary">Payment method</Typography>
                    <Typography variant="body2">{booking.paymentMethod}</Typography>
                  </Grid>
                )}

                {booking.paidAt && (
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary">Paid at</Typography>
                    <Typography variant="body2">{formatDate(booking.paidAt)}</Typography>
                  </Grid>
                )}

                {booking.notes && (
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="caption" color="text.secondary">Notes</Typography>
                    <Typography variant="body2">{booking.notes}</Typography>
                  </Grid>
                )}

                {booking.paymentNotes && (
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="caption" color="text.secondary">Payment notes</Typography>
                    <Typography variant="body2">{booking.paymentNotes}</Typography>
                  </Grid>
                )}

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">Source</Typography>
                  <Typography variant="body2">{booking.source ?? 'web'}</Typography>
                </Grid>

                {booking.pricingRule && (
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary">Pricing rule</Typography>
                    <Typography variant="body2">{booking.pricingRule.name}</Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Right: payment summary */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                Payment Summary
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
                  No payment breakdown available.
                </Typography>
              )}

              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2">Total</Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {booking.totalAmount != null
                    ? `${currency} ${Number(booking.totalAmount).toFixed(2)}`
                    : '—'}
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Place link */}
          <Card variant="outlined" sx={{ borderRadius: 2, mt: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                Place
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {booking.activityLocation.place.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {booking.activityLocation.name}
              </Typography>
              <Link href={`/admin/places/${booking.activityLocation.place.id}`} style={{ textDecoration: 'none' }}>
                <Button variant="outlined" size="small">
                  View place
                </Button>
              </Link>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
