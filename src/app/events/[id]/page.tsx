'use client';

import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Chip,
  Button,
  TextField,
  Alert,
  Divider,
  CircularProgress,
  Stack,
  MenuItem,
} from '@mui/material';
import {
  CalendarMonth,
  AccessTime,
  LocationOn,
  People,
  ArrowBack,
  CheckCircle,
  EventAvailable,
} from '@mui/icons-material';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { useTranslation } from '@/i18n/client';
import { useCurrency } from '@/lib/currency';
import { useSession } from 'next-auth/react';

interface PricingTier {
  id: string;
  ageGroup: string;
  label: string;
  pricePerUnit: string | number;
}

interface PricingRule {
  id: string;
  name: string;
  currency: string;
  pricingType: string;
  paymentMethod: string;
  requiresPayment: boolean;
  pricingTiers: PricingTier[];
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
  pricingRule: PricingRule | null;
  eventPricingRules: { id: string; pricingRule: PricingRule }[];
  isActive: boolean;
  place: {
    id: string;
    name: string;
    slug: string;
    city: string | null;
    country: string | null;
    coverUrl: string | null;
    logoUrl: string | null;
    phone: string | null;
    email: string | null;
  };
  _count: { registrations: number };
}

type Step = 'guests' | 'contact' | 'confirm' | 'done';

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useTranslation('common');
  const { data: session } = useSession();
  const router = useRouter();
  const { formatPrice } = useCurrency();

  const [event, setEvent] = useState<PlaceEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reservation form state
  const [step, setStep] = useState<Step>('guests');
  const [guestCounts, setGuestCounts] = useState<Record<string, number>>({ adults: 1 });
  const [firstName, setFirstName] = useState(session?.user?.name?.split(' ')[0] ?? '');
  const [lastName, setLastName] = useState(session?.user?.name?.split(' ').slice(1).join(' ') ?? '');
  const [email, setEmail] = useState(session?.user?.email ?? '');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [selectedPricingRuleId, setSelectedPricingRuleId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [editToken, setEditToken] = useState<string | null>(null);
  const [regNumber, setRegNumber] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/events/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error(d.error ?? 'Event not found');
        const ev = d.data as PlaceEvent;
        setEvent(ev);
        // Auto-select first pricing rule
        const firstRule = ev.eventPricingRules?.[0]?.pricingRule ?? ev.pricingRule;
        if (firstRule) setSelectedPricingRuleId(firstRule.id);
      })
      .catch((e) => setError(e.message ?? 'Failed to load event'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (session?.user) {
      const parts = session.user.name?.split(' ') ?? [];
      setFirstName((v) => v || (parts[0] ?? ''));
      setLastName((v) => v || (parts.slice(1).join(' ') ?? ''));
      setEmail((v) => v || (session.user?.email ?? ''));
    }
  }, [session]);

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh' }}>
        <Navbar />
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  if (error || !event) {
    return (
      <Box sx={{ minHeight: '100vh' }}>
        <Navbar />
        <Container maxWidth="md" sx={{ py: 6 }}>
          <Alert severity="error">{error ?? 'Event not found'}</Alert>
          <Button component={Link} href="/search" startIcon={<ArrowBack />} sx={{ mt: 2 }}>
            Back to search
          </Button>
        </Container>
      </Box>
    );
  }

  const eventDate = new Date(event.eventDate);
  const isPast = eventDate < new Date();
  const isFull = event.maxReservations != null && event._count.registrations >= event.maxReservations;
  const isDeadlinePassed = event.reservationDeadline ? new Date() > new Date(event.reservationDeadline) : false;
  const canReserve = event.isActive && !isPast && !isFull && !isDeadlinePassed;
  const spotsLeft = event.maxReservations != null ? event.maxReservations - event._count.registrations : null;

  // Build list of all available pricing rules (multi list takes priority)
  const availablePricingRules: PricingRule[] = event.eventPricingRules.length > 0
    ? event.eventPricingRules.map((r) => r.pricingRule)
    : (event.pricingRule ? [event.pricingRule] : []);

  const selectedPricingRule = availablePricingRules.find((r) => r.id === selectedPricingRuleId)
    ?? availablePricingRules[0]
    ?? null;

  const tiers = selectedPricingRule?.pricingTiers ?? [];

  // Calculate live estimated price
  const calcTotal = () => {
    if (!selectedPricingRule) return null;
    const rule = selectedPricingRule;
    let total = 0;
    for (const tier of tiers) {
      let key = tier.ageGroup.toLowerCase() + 's';
      if (tier.ageGroup === 'CUSTOM') key = `custom:${tier.id}`;
      if (tier.ageGroup === 'FAMILY') key = 'families';
      if (tier.ageGroup === 'GROUP') key = 'groups';
      if (tier.ageGroup === 'INFANT') key = 'infants';
      if (tier.ageGroup === 'SENIOR') key = 'seniors';
      if (tier.ageGroup === 'ADULT') key = 'adults';
      if (tier.ageGroup === 'CHILD') key = 'children';
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
          pricingRuleId: selectedPricingRule?.id ?? undefined,
          source: 'web',
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

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar />

      {/* Cover image */}
      {(event.imageUrl ?? event.place.coverUrl) && (
        <Box
          sx={{
            height: { xs: 200, md: 320 },
            backgroundImage: `url(${event.imageUrl ?? event.place.coverUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Button component={Link} href="/search?tab=events" startIcon={<ArrowBack />} sx={{ mb: 2 }}>
          {t('search.allEvents', 'All Events')}
        </Button>

        <Grid container spacing={4}>
          {/* Left: Event info */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              {!event.isActive && <Chip label="Inactive" size="small" color="default" />}
              {isPast && <Chip label="Past event" size="small" color="default" />}
              {isFull && <Chip label="Fully booked" size="small" color="warning" />}
              {canReserve && spotsLeft != null && spotsLeft <= 5 && (
                <Chip label={`${spotsLeft} spots left`} size="small" color="error" />
              )}
            </Box>

            <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
              {event.title}
            </Typography>

            <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CalendarMonth fontSize="small" color="action" />
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {eventDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AccessTime fontSize="small" color="action" />
                <Typography variant="body1">
                  {event.startTime} – {event.endTime}
                </Typography>
              </Box>
            </Stack>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 3 }}>
              <LocationOn fontSize="small" color="action" />
              <Typography variant="body1" color="text.secondary">
                {event.place.name}
                {event.place.city ? `, ${event.place.city}` : ''}
                {event.place.country ? `, ${event.place.country}` : ''}
              </Typography>
            </Box>

            {event.description && (
              <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.8, whiteSpace: 'pre-line' }}>
                {event.description}
              </Typography>
            )}

            {event.maxReservations != null && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 2 }}>
                <People fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {event._count.registrations} / {event.maxReservations} reserved
                </Typography>
              </Box>
            )}

            {availablePricingRules.length > 1 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Choose Pricing Option
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {availablePricingRules.map((rule) => (
                    <Chip
                      key={rule.id}
                      label={rule.name}
                      onClick={() => { setSelectedPricingRuleId(rule.id); setGuestCounts({ adults: 1 }); }}
                      color={selectedPricingRule?.id === rule.id ? 'primary' : 'default'}
                      variant={selectedPricingRule?.id === rule.id ? 'filled' : 'outlined'}
                      sx={{ cursor: 'pointer' }}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {selectedPricingRule && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Pricing
                </Typography>
                {tiers.map((tier) => (
                  <Box key={tier.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                    <Typography variant="body2">{tier.label}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {formatPrice(Number(tier.pricePerUnit), selectedPricingRule.currency)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Grid>

          {/* Right: Reservation form */}
          <Grid size={{ xs: 12, md: 5 }}>
            {step === 'done' ? (
              <Paper sx={{ p: 3, borderRadius: 2, textAlign: 'center', border: '2px solid', borderColor: 'success.main' }}>
                <CheckCircle sx={{ fontSize: 56, color: 'success.main', mb: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  Reservation Confirmed!
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Booking #{regNumber}
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  A confirmation email has been sent to <strong>{email}</strong>.
                </Typography>
                {editToken && (
                  <Button
                    variant="outlined"
                    fullWidth
                    href={`/registration/edit/${editToken}`}
                    sx={{ mb: 1 }}
                  >
                    View My Reservation
                  </Button>
                )}
                <Button variant="text" href="/search?tab=events" fullWidth>
                  Browse More Events
                </Button>
              </Paper>
            ) : !canReserve ? (
              <Paper sx={{ p: 3, borderRadius: 2 }}>
                <EventAvailable sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                <Typography variant="body1" color="text.secondary">
                  {isPast
                    ? 'This event has already taken place.'
                    : isFull
                    ? 'This event is fully booked.'
                    : isDeadlinePassed
                    ? 'Reservation deadline has passed.'
                    : 'Reservations are not available for this event.'}
                </Typography>
              </Paper>
            ) : (
              <Paper sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                  Reserve Your Spot
                </Typography>

                {submitError && (
                  <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>
                    {submitError}
                  </Alert>
                )}

                {/* Step: Guests */}
                {step === 'guests' && (
                  <Box>
                    {tiers.length > 0 ? (
                      tiers.map((tier) => {
                        let key = 'adults';
                        if (tier.ageGroup === 'ADULT') key = 'adults';
                        else if (tier.ageGroup === 'CHILD') key = 'children';
                        else if (tier.ageGroup === 'SENIOR') key = 'seniors';
                        else if (tier.ageGroup === 'INFANT') key = 'infants';
                        else if (tier.ageGroup === 'FAMILY') key = 'families';
                        else if (tier.ageGroup === 'GROUP') key = 'groups';
                        else key = `custom:${tier.id}`;

                        return (
                          <Box key={tier.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>{tier.label}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatPrice(Number(tier.pricePerUnit), selectedPricingRule!.currency)} each
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Button
                                size="small"
                                variant="outlined"
                                sx={{ minWidth: 32, p: 0 }}
                                onClick={() =>
                                  setGuestCounts((c) => ({ ...c, [key]: Math.max(0, (c[key] ?? 0) - 1) }))
                                }
                              >
                                –
                              </Button>
                              <Typography sx={{ minWidth: 24, textAlign: 'center' }}>
                                {guestCounts[key] ?? 0}
                              </Typography>
                              <Button
                                size="small"
                                variant="outlined"
                                sx={{ minWidth: 32, p: 0 }}
                                onClick={() =>
                                  setGuestCounts((c) => ({ ...c, [key]: (c[key] ?? 0) + 1 }))
                                }
                              >
                                +
                              </Button>
                            </Box>
                          </Box>
                        );
                      })
                    ) : (
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>Guests</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Button
                            size="small"
                            variant="outlined"
                            sx={{ minWidth: 32, p: 0 }}
                            onClick={() => setGuestCounts((c) => ({ ...c, adults: Math.max(1, (c.adults ?? 1) - 1) }))}
                          >
                            –
                          </Button>
                          <Typography sx={{ minWidth: 24, textAlign: 'center' }}>{guestCounts.adults ?? 1}</Typography>
                          <Button
                            size="small"
                            variant="outlined"
                            sx={{ minWidth: 32, p: 0 }}
                            onClick={() => setGuestCounts((c) => ({ ...c, adults: (c.adults ?? 1) + 1 }))}
                          >
                            +
                          </Button>
                        </Box>
                      </Box>
                    )}

                    {estimatedTotal != null && estimatedTotal > 0 && (
                      <Box sx={{ mt: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>Estimated Total</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {formatPrice(estimatedTotal, selectedPricingRule!.currency)}
                          </Typography>
                        </Box>
                      </Box>
                    )}

                    <Button
                      variant="contained"
                      fullWidth
                      sx={{ mt: 2 }}
                      onClick={() => setStep('contact')}
                      disabled={Object.values(guestCounts).every((v) => v === 0)}
                    >
                      Continue
                    </Button>
                  </Box>
                )}

                {/* Step: Contact */}
                {step === 'contact' && (
                  <Box>
                    <Grid container spacing={1.5}>
                      <Grid size={{ xs: 6 }}>
                        <TextField
                          label="First Name"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          fullWidth
                          size="small"
                          required
                        />
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <TextField
                          label="Last Name"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          fullWidth
                          size="small"
                          required
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          label="Email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          fullWidth
                          size="small"
                          required
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          label="Phone (optional)"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          fullWidth
                          size="small"
                        />
                      </Grid>
                      {event.pricingRule?.requiresPayment && (
                        <Grid size={{ xs: 12 }}>
                          <TextField
                            label="Payment Method"
                            select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            fullWidth
                            size="small"
                            required
                          >
                            {(event.pricingRule.paymentMethod === 'BOTH' || event.pricingRule.paymentMethod === 'CASH') && (
                              <MenuItem value="CASH">Cash</MenuItem>
                            )}
                            {(event.pricingRule.paymentMethod === 'BOTH' || event.pricingRule.paymentMethod === 'CARD') && (
                              <MenuItem value="CARD">Card</MenuItem>
                            )}
                          </TextField>
                        </Grid>
                      )}
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          label="Notes (optional)"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          fullWidth
                          size="small"
                          multiline
                          rows={2}
                        />
                      </Grid>
                    </Grid>
                    <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                      <Button variant="outlined" onClick={() => setStep('guests')} sx={{ flex: 1 }}>
                        Back
                      </Button>
                      <Button
                        variant="contained"
                        onClick={() => setStep('confirm')}
                        disabled={!firstName || !lastName || !email}
                        sx={{ flex: 2 }}
                      >
                        Review
                      </Button>
                    </Box>
                  </Box>
                )}

                {/* Step: Confirm */}
                {step === 'confirm' && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                      Review your reservation
                    </Typography>
                    <Divider sx={{ mb: 1.5 }} />
                    {[
                      ['Event', event.title],
                      ['Date', `${eventDate.toLocaleDateString()} · ${event.startTime}–${event.endTime}`],
                      ['Name', `${firstName} ${lastName}`],
                      ['Email', email],
                      ...(phone ? [['Phone', phone]] : []),
                      ...(Object.entries(guestCounts)
                        .filter(([, v]) => v > 0)
                        .map(([k, v]) => [k.replace('custom:', '').replace('adults', 'Adults').replace('children', 'Children').replace('seniors', 'Seniors'), String(v)])),
                      ...(estimatedTotal != null && estimatedTotal > 0
                        ? [['Total', formatPrice(estimatedTotal, selectedPricingRule!.currency)]]
                        : []),
                    ].map(([label, value]) => (
                      <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.4 }}>
                        <Typography variant="caption" color="text.secondary">{label}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>
                          {value}
                        </Typography>
                      </Box>
                    ))}

                    <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                      <Button variant="outlined" onClick={() => setStep('contact')} sx={{ flex: 1 }}>
                        Back
                      </Button>
                      <Button
                        variant="contained"
                        color="success"
                        onClick={handleSubmit}
                        disabled={submitting}
                        startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
                        sx={{ flex: 2 }}
                      >
                        {submitting ? 'Confirming…' : 'Confirm Reservation'}
                      </Button>
                    </Box>
                  </Box>
                )}
              </Paper>
            )}
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
