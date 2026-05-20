'use client';

import {
  Box,
  Typography,
  Button,
  TextField,
  Alert,
  Divider,
  CircularProgress,
  Grid,
  MenuItem,
  Stack,
  Chip,
} from '@mui/material';
import { CalendarMonth, AccessTime, LocationOn, CheckCircle, EventAvailable } from '@mui/icons-material';
import { useState } from 'react';
import { useCurrency } from '@/lib/currency';
import { useTranslation } from '@/i18n/client';

interface PricingTier {
  id: string;
  ageGroup: string;
  label: string;
  pricePerUnit: number;
}

interface PlaceEvent {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  eventDate: string;
  startTime: string;
  endTime: string;
  maxReservations: number | null;
  reservationDeadline: string | null;
  isActive: boolean;
  place: {
    name: string;
    city: string | null;
    country: string | null;
    logoUrl: string | null;
  };
  pricingRule: {
    id: string;
    name: string;
    currency: string;
    pricingType: string;
    paymentMethod: string;
    requiresPayment: boolean;
    pricingTiers: PricingTier[];
  } | null;
  _count: { registrations: number };
}

interface Props {
  event: PlaceEvent;
  embedTokenId: string;
}

type Step = 'guests' | 'contact' | 'confirm' | 'done';

export default function EventEmbedBookingForm({ event, embedTokenId }: Props) {
  const { formatPrice } = useCurrency();
  const { t } = useTranslation('common');

  const [step, setStep] = useState<Step>('guests');
  const [guestCounts, setGuestCounts] = useState<Record<string, number>>({});
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [editToken, setEditToken] = useState<string | null>(null);
  const [regNumber, setRegNumber] = useState<string | null>(null);

  const eventDate = new Date(event.eventDate);
  const isPast = eventDate < new Date();
  const isFull = event.maxReservations != null && event._count.registrations >= event.maxReservations;
  const isDeadlinePassed = event.reservationDeadline ? new Date() > new Date(event.reservationDeadline) : false;
  const canReserve = event.isActive && !isPast && !isFull && !isDeadlinePassed;
  const tiers = event.pricingRule?.pricingTiers ?? [];
  const currency = event.pricingRule?.currency ?? 'EUR';

  const tierKey = (tier: PricingTier) => {
    const ag = tier.ageGroup;
    if (ag === 'ADULT') return 'adults';
    if (ag === 'CHILD') return 'children';
    if (ag === 'SENIOR') return 'seniors';
    if (ag === 'INFANT') return 'infants';
    if (ag === 'FAMILY') return 'families';
    if (ag === 'GROUP') return 'groups';
    return `custom:${tier.id}`;
  };

  const calcTotal = () => {
    if (!event.pricingRule) return null;
    const rule = event.pricingRule;
    let total = 0;
    for (const tier of tiers) {
      const key = tierKey(tier);
      const count = guestCounts[key] ?? 0;
      if (count <= 0) continue;
      const price = Number(tier.pricePerUnit);
      if (rule.pricingType === 'PER_ACTIVITY') { total += price; break; }
      if (rule.pricingType === 'PER_PERSON' || rule.pricingType === 'PER_PERSON_PER_DAY') total += price * count;
      if (rule.pricingType === 'PER_DAY') { total += price; break; }
    }
    return total;
  };

  const estimatedTotal = calcTotal();
  const hasGuests = Object.values(guestCounts).some((v) => v > 0);

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          firstName,
          lastName,
          email,
          phone: phone || undefined,
          notes: notes || undefined,
          guestCounts,
          paymentMethod: paymentMethod || undefined,
          embedTokenId,
          source: 'embed',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to submit reservation');
      setEditToken(data.data.editToken);
      setRegNumber(data.data.registrationNumber);
      setStep('done');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  // Event summary header always visible
  const EventHeader = () => (
    <Box sx={{ mb: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>{event.title}</Typography>
      <Stack direction="row" spacing={1.5} sx={{ mb: 0.5, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <CalendarMonth fontSize="small" color="action" />
          <Typography variant="body2">
            {eventDate.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <AccessTime fontSize="small" color="action" />
          <Typography variant="body2">{event.startTime} – {event.endTime}</Typography>
        </Box>
      </Stack>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <LocationOn fontSize="small" color="action" />
        <Typography variant="body2" color="text.secondary">
          {event.place.name}{event.place.city ? `, ${event.place.city}` : ''}
        </Typography>
      </Box>
      <Divider sx={{ mt: 2 }} />
    </Box>
  );

  if (step === 'done') {
    return (
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <EventHeader />
        <CheckCircle sx={{ fontSize: 56, color: 'success.main', mb: 1 }} />
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>{t('event.reservationConfirmed', 'Reservation Confirmed!')}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          {t('event.bookingPrefix', 'Booking #')}{regNumber}
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {t('event.confirmationSentTo', 'Confirmation sent to')} <strong>{email}</strong>.
        </Typography>
        {editToken && (
          <Button
            variant="outlined"
            fullWidth
            href={`/registration/edit/${editToken}`}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ mb: 1 }}
          >
            {t('event.viewMyReservation', 'View My Reservation')}
          </Button>
        )}
      </Box>
    );
  }

  if (!canReserve) {
    return (
      <Box>
        <EventHeader />
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <EventAvailable sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Chip
            label={
              isPast ? t('event.pastEvent', 'Past Event')
              : isFull ? t('event.fullyBooked', 'Fully Booked')
              : isDeadlinePassed ? t('event.deadlinePassedChip', 'Deadline Passed')
              : t('event.notAvailableChip', 'Not Available')
            }
            color="default"
            sx={{ mb: 1 }}
          />
          <Typography variant="body2" color="text.secondary">
            {isPast ? t('event.alreadyTookPlace', 'This event has already taken place.')
             : isFull ? t('event.fullyBookedMsg', 'This event is fully booked.')
             : isDeadlinePassed ? t('event.deadlinePassedMsg', 'The reservation deadline has passed.')
             : t('event.notAvailableMsg', 'Reservations are not currently available.')}
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <EventHeader />

      {submitError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>
          {submitError}
        </Alert>
      )}

      {/* Step: Guests */}
      {step === 'guests' && (
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>{t('event.selectGuests', 'Select Guests')}</Typography>
          {tiers.length > 0 ? (
            tiers.map((tier) => {
              const key = tierKey(tier);
              return (
                <Box key={tier.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{tier.label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatPrice(tier.pricePerUnit, currency)} {t('event.each', 'each')}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      sx={{ minWidth: 32, p: 0 }}
                      onClick={() => setGuestCounts((c) => ({ ...c, [key]: Math.max(0, (c[key] ?? 0) - 1) }))}
                    >–</Button>
                    <Typography sx={{ minWidth: 24, textAlign: 'center' }}>{guestCounts[key] ?? 0}</Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      sx={{ minWidth: 32, p: 0 }}
                      onClick={() => setGuestCounts((c) => ({ ...c, [key]: (c[key] ?? 0) + 1 }))}
                    >+</Button>
                  </Box>
                </Box>
              );
            })
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{t('event.guests', 'Guests')}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  sx={{ minWidth: 32, p: 0 }}
                  onClick={() => setGuestCounts((c) => ({ ...c, adults: Math.max(1, (c.adults ?? 1) - 1) }))}
                >–</Button>
                <Typography sx={{ minWidth: 24, textAlign: 'center' }}>{guestCounts.adults ?? 1}</Typography>
                <Button
                  size="small"
                  variant="outlined"
                  sx={{ minWidth: 32, p: 0 }}
                  onClick={() => setGuestCounts((c) => ({ ...c, adults: (c.adults ?? 1) + 1 }))}
                >+</Button>
              </Box>
            </Box>
          )}

          {estimatedTotal != null && estimatedTotal > 0 && (
            <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{t('event.estimatedTotal', 'Estimated Total')}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {formatPrice(estimatedTotal, currency)}
                </Typography>
              </Box>
            </Box>
          )}

          <Button
            variant="contained"
            fullWidth
            sx={{ mt: 2 }}
            onClick={() => setStep('contact')}
            disabled={tiers.length > 0 ? !hasGuests : (guestCounts.adults ?? 1) < 1}
          >
            {t('event.continue', 'Continue')}
          </Button>
        </Box>
      )}

      {/* Step: Contact */}
      {step === 'contact' && (
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>{t('event.yourDetails', 'Your Details')}</Typography>
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 6 }}>
              <TextField size="small" label={t('event.firstName', 'First Name')} value={firstName} onChange={(e) => setFirstName(e.target.value)} fullWidth required />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField size="small" label={t('event.lastName', 'Last Name')} value={lastName} onChange={(e) => setLastName(e.target.value)} fullWidth required />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField size="small" label={t('common.email', 'Email')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth required />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField size="small" label={t('event.phone', 'Phone (optional)')} value={phone} onChange={(e) => setPhone(e.target.value)} fullWidth />
            </Grid>
            {event.pricingRule?.requiresPayment && (
              <Grid size={{ xs: 12 }}>
                <TextField select size="small" label={t('event.paymentMethod', 'Payment Method')} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} fullWidth required>
                  {(event.pricingRule.paymentMethod === 'BOTH' || event.pricingRule.paymentMethod === 'CASH') && (
                    <MenuItem value="CASH">{t('event.cash', 'Cash')}</MenuItem>
                  )}
                  {(event.pricingRule.paymentMethod === 'BOTH' || event.pricingRule.paymentMethod === 'CARD') && (
                    <MenuItem value="CARD">{t('event.card', 'Card')}</MenuItem>
                  )}
                </TextField>
              </Grid>
            )}
            <Grid size={{ xs: 12 }}>
              <TextField size="small" label={t('event.notes', 'Notes (optional)')} value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth multiline rows={2} />
            </Grid>
          </Grid>
          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <Button variant="outlined" onClick={() => setStep('guests')} sx={{ flex: 1 }}>{t('common.back', 'Back')}</Button>
            <Button
              variant="contained"
              onClick={() => setStep('confirm')}
              disabled={!firstName || !lastName || !email}
              sx={{ flex: 2 }}
            >
              {t('event.review', 'Review')}
            </Button>
          </Box>
        </Box>
      )}

      {/* Step: Confirm */}
      {step === 'confirm' && (
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{t('event.reviewReservation', 'Review Reservation')}</Typography>
          <Divider sx={{ mb: 1.5 }} />
          {[
            ['Name', `${firstName} ${lastName}`],
            ['Email', email],
            ...(phone ? [['Phone', phone]] : []),
            ...Object.entries(guestCounts)
              .filter(([, v]) => v > 0)
              .map(([k, v]) => {
                const tierLabel = tiers.find((t) => tierKey(t) === k)?.label ?? k;
                return [tierLabel, String(v)];
              }),
            ...(estimatedTotal != null && estimatedTotal > 0
              ? [['Total', formatPrice(estimatedTotal, currency)]]
              : []),
          ].map(([label, value]) => (
            <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.4 }}>
              <Typography variant="caption" color="text.secondary">{label}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>{value}</Typography>
            </Box>
          ))}
          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <Button variant="outlined" onClick={() => setStep('contact')} sx={{ flex: 1 }}>{t('common.back', 'Back')}</Button>
            <Button
              variant="contained"
              color="success"
              onClick={handleSubmit}
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
              sx={{ flex: 2 }}
            >
              {submitting ? t('event.confirming', 'Confirming…') : t('event.confirm', 'Confirm')}
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}
