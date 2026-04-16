'use client';

import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Chip,
  Grid,
  CardActionArea,
} from '@mui/material';
import {
  CalendarMonth,
  Group,
  Person,
  Payment,
  CheckCircle,
} from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from '@/i18n/client';
import { format, differenceInCalendarDays, addDays } from 'date-fns';
import type { SpotMapItem } from '@/components/map/SpotMap';
import { calculatePricing as calculatePricingLocal, getPricingTierGuestKey, formatGuestSummary } from '@/lib/pricing';
import {
  PricingRule,
  PaymentMethod,
  PricingType,
  RegistrationFormData,
} from '@/types';
import ReviewForm from '@/components/reviews/ReviewForm';
import GallerySection from './GallerySection';
import StepLocation from './steps/StepLocation';
import StepContact from './steps/StepContact';
import StepGuestsPayment from './steps/StepGuestsPayment';
import StepConfirm from './steps/StepConfirm';
import type { LocationWithDetails, AvailableSpot, Step1Values, Step2Values, Step3Values } from './types';

const step1Schema = z
  .object({
    startDate: z.string().min(1, 'validation.startDateRequired'),
    endDate: z.string().min(1, 'validation.endDateRequired'),
    spotIds: z.array(z.string()),
  })
  .refine((d) => new Date(d.endDate) > new Date(d.startDate), {
    message: 'validation.endDateAfterStart',
    path: ['endDate'],
  });

const step2Schema = z.object({
  guestCounts: z.record(z.string(), z.number().int().min(0)),
  pricingRuleId: z.string().optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  notes: z.string().optional(),
});

const step3Schema = z.object({
  firstName: z.string().min(1, 'validation.firstNameRequired'),
  lastName: z.string().min(1, 'validation.lastNameRequired'),
  email: z.string().email('validation.emailInvalid'),
  phone: z.string().optional(),
  address: z.string().optional(),
});


interface RegistrationStepperProps {
  location: LocationWithDetails;
  locations?: LocationWithDetails[];
  embedTokenId?: string;
  initialActivityTypeId?: string | null;
  onSuccess?: (registrationNumber: string) => void;
}

export default function RegistrationStepper({
  location,
  locations,
  embedTokenId,
  initialActivityTypeId,
  onSuccess,
}: RegistrationStepperProps) {
  const { t } = useTranslation('registration');
  const { t: tc } = useTranslation('common');

  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<Partial<RegistrationFormData>>({
    activityLocationId: undefined,
    spotIds: [],
    guestCounts: { adults: 1 },
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [registrationNumber, setRegistrationNumber] = useState<string | null>(null);
  const [submittedEditToken, setSubmittedEditToken] = useState<string | null>(null);
  const [submittedPlaceId, setSubmittedPlaceId] = useState<string | null>(null);
  const [step2Error, setStep2Error] = useState<string | null>(null);

  const [locationSelectMode, setLocationSelectMode] = useState<'list' | 'map'>('list');
  const [mapSubMode, setMapSubMode] = useState<'virtual' | 'real'>('virtual');
  const allLocations = locations && locations.length > 0 ? locations : [location];

  // Derive unique activity types from all locations via join table
  const activityTypes = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; icon: string | null; color: string | null }>();
    for (const loc of allLocations) {
      const types = (loc as unknown as Record<string, unknown>).activityTypes as
        | Array<{ activityTypeId: string; activityType: { name: string; icon?: string | null; color?: string | null } }>
        | undefined;
      if (types) {
        for (const entry of types) {
          if (!seen.has(entry.activityTypeId)) {
            seen.set(entry.activityTypeId, {
              id: entry.activityTypeId,
              name: entry.activityType.name,
              icon: entry.activityType.icon ?? null,
              color: entry.activityType.color ?? null,
            });
          }
        }
      }
    }
    return Array.from(seen.values());
  }, [allLocations]);

  const hasMultipleActivityTypes = activityTypes.length > 1;
  const [selectedActivityTypeId, setSelectedActivityTypeId] = useState<string | null>(
    initialActivityTypeId ?? (hasMultipleActivityTypes ? null : (activityTypes[0]?.id ?? null))
  );

  // Sync when parent drives the activity selection (e.g. sidebar chip click)
  useEffect(() => {
    if (initialActivityTypeId !== undefined) {
      setSelectedActivityTypeId(initialActivityTypeId ?? null);
      setSelectedLocationId(null);
      setActiveStep(0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialActivityTypeId]);

  // Filter locations by selected activity type via join table
  const availableLocations = useMemo(
    () => selectedActivityTypeId
      ? allLocations.filter((loc) => {
          const types = (loc as unknown as Record<string, unknown>).activityTypes as
            | Array<{ activityTypeId: string }>
            | undefined;
          return types?.some((e) => e.activityTypeId === selectedActivityTypeId) ?? false;
        })
      : allLocations,
    [allLocations, selectedActivityTypeId]
  );

  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const selectedLocation = availableLocations.find((loc) => loc.id === selectedLocationId) ?? null;

  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [availableSpots, setAvailableSpots] = useState<AvailableSpot[]>([]);

  // spotId â†’ selected timeslotId
  const [spotTimeslotSelections, setSpotTimeslotSelections] = useState<Record<string, string>>({});

  const selectTimeslot = (spotId: string, timeslotId: string) => {
    setSpotTimeslotSelections((prev) => ({ ...prev, [spotId]: timeslotId }));
  };

  const clearTimeslotForSpot = (spotId: string) => {
    setSpotTimeslotSelections((prev) => { const next = { ...prev }; delete next[spotId]; return next; });
  };


  const today = format(new Date(), 'yyyy-MM-dd');
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  const {
    control: control1,
    handleSubmit: handleSubmit1,
    watch: watch1,
    setValue: setValue1,
    setError: setError1,
    formState: { errors: errors1 },
  } = useForm<Step1Values>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      startDate: today,
      endDate: tomorrow,
      spotIds: [],
    },
  });

  const startDate = watch1('startDate');
  const endDate = watch1('endDate');
  const selectedSpotIds = watch1('spotIds');

  const numberOfDays = Math.max(
    1,
    startDate && endDate ? differenceInCalendarDays(new Date(endDate), new Date(startDate)) : 1,
  );

  const handleSpotToggle = (spot: SpotMapItem) => {
    const current = selectedSpotIds ?? [];
    const next = current.includes(spot.id)
      ? current.filter((id) => id !== spot.id)
      : [...current, spot.id];
    setValue1('spotIds', next);
    // Clear timeslot selection when spot is deselected
    if (current.includes(spot.id)) {
      clearTimeslotForSpot(spot.id);
    }
  };

  const pricingRules = selectedLocation?.pricingRules ?? [];

  const getDefaultGuestCounts = useCallback((rule?: PricingRule | null) => {
    if (!rule?.pricingTiers || rule.pricingTiers.length === 0) return { adults: 1 };

    const next: Record<string, number> = {};
    rule.pricingTiers.forEach((tier, index) => {
      const key = getPricingTierGuestKey(tier, index);
      next[key] = 0;
    });

    const firstKey = getPricingTierGuestKey(rule.pricingTiers[0], 0);
    next[firstKey] = 1;
    return next;
  }, []);

  const {
    control: control2,
    handleSubmit: handleSubmit2,
    watch: watch2,
    setValue: setValue2,
  } = useForm<Step2Values>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      guestCounts: { adults: 1 },
      pricingRuleId: '',
      paymentMethod: PaymentMethod.CASH,
    },
  });

  const guestCounts = watch2('guestCounts');
  const selectedRuleId = watch2('pricingRuleId');
  const selectedRule = pricingRules.find((rule) => rule.id === selectedRuleId) ?? pricingRules[0] ?? null;
  const isGuestCountRule =
    selectedRule?.pricingType === PricingType.PER_PERSON || selectedRule?.pricingType === PricingType.PER_PERSON_PER_DAY;
  const summaryRule =
    pricingRules.find((rule) => rule.id === formData.pricingRuleId)
    ?? pricingRules.find((rule) => rule.id === selectedRuleId)
    ?? null;
  const summaryUsesGuestCounts =
    summaryRule?.pricingType === PricingType.PER_PERSON || summaryRule?.pricingType === PricingType.PER_PERSON_PER_DAY;
  const dynamicGuestFields = selectedRule?.pricingTiers?.map((tier, index) => ({
    key: getPricingTierGuestKey(tier, index),
    label: tier.label,
  })) ?? [{ key: 'adults', label: t('guestTypes.adults') }];

  const {
    register: register3,
    handleSubmit: handleSubmit3,
    formState: { errors: errors3 },
  } = useForm<Step3Values>({
    resolver: zodResolver(step3Schema),
  });

useEffect(() => {
    if (!selectedLocation) {
      setAvailableSpots([]);
      return;
    }
    setFormData((prev) => ({ ...prev, activityLocationId: selectedLocation.id }));
    setValue1('spotIds', []);
    const firstRule = selectedLocation.pricingRules?.[0] ?? null;
    setValue2('pricingRuleId', firstRule?.id ?? '');
    setValue2('guestCounts', getDefaultGuestCounts(firstRule));
  }, [selectedLocation?.id]);

  useEffect(() => {
    const rule = pricingRules.find((pricingRule) => pricingRule.id === selectedRuleId) ?? null;
    if (!rule?.pricingTiers || rule.pricingTiers.length === 0) return;

    const currentCounts = guestCounts ?? {};
    const normalized: Record<string, number> = {};
    for (const [index, tier] of rule.pricingTiers.entries()) {
      const key = getPricingTierGuestKey(tier, index);
      normalized[key] = currentCounts[key] ?? 0;
    }

    const guestCountDriven =
      rule.pricingType === PricingType.PER_PERSON || rule.pricingType === PricingType.PER_PERSON_PER_DAY;

    if (!guestCountDriven) {
      for (const key of Object.keys(normalized)) {
        normalized[key] = 0;
      }
      const firstKey = getPricingTierGuestKey(rule.pricingTiers[0], 0);
      normalized[firstKey] = 1;
    } else if (Object.values(normalized).every((value) => value <= 0)) {
      const firstKey = getPricingTierGuestKey(rule.pricingTiers[0], 0);
      normalized[firstKey] = 1;
    }

    const needsUpdate =
      Object.keys(currentCounts).length !== Object.keys(normalized).length
      || Object.keys(normalized).some((key) => normalized[key] !== currentCounts[key]);

    if (needsUpdate) {
      setValue2('guestCounts', normalized);
    }

    if (!rule.requiresPayment) {
      setValue2('paymentMethod', undefined);
    } else if (rule.paymentMethod === PaymentMethod.BOTH) {
      setValue2('paymentMethod', PaymentMethod.CASH);
    } else {
      setValue2('paymentMethod', rule.paymentMethod);
    }
  }, [selectedRuleId, pricingRules, guestCounts, setValue2]);

  useEffect(() => {
    if (!selectedLocation || !startDate || !endDate) {
      setAvailableSpots([]);
      return;
    }

    const run = async () => {
      setAvailabilityLoading(true);
      setAvailabilityError(null);
      try {
        const params = new URLSearchParams({
          activityLocationId: selectedLocation.id,
          startDate,
          endDate,
        });
        // Pass selected activity type so activity-specific spots are filtered server-side
        if (selectedActivityTypeId) {
          params.set('activityTypeId', selectedActivityTypeId);
        }
        const res = await fetch(`/api/spots/availability?${params.toString()}`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success) {
          throw new Error(json.error ?? t('errors.availabilityFailed'));
        }

        const fetched = (json.data ?? []) as AvailableSpot[];
        setAvailableSpots(fetched);

        const stillAvailableIds = new Set(
          fetched.filter((s) => s.isAvailable !== false).map((s) => s.id)
        );
        const nextSpotIds = (selectedSpotIds ?? []).filter((id) => stillAvailableIds.has(id));
        setValue1('spotIds', nextSpotIds);
        // Clear timeslot selections for spots that are no longer selected
        setSpotTimeslotSelections((prev) => {
          const next: Record<string, string> = {};
          for (const id of nextSpotIds) { if (prev[id]) next[id] = prev[id]; }
          return next;
        });
      } catch (err) {
        setAvailabilityError(err instanceof Error ? err.message : t('errors.availabilityFailed'));
      } finally {
        setAvailabilityLoading(false);
      }
    };

    run();
  }, [selectedLocation?.id, startDate, endDate, selectedActivityTypeId]);

  const livePricing = useMemo(() => {
    if (!selectedRule || !selectedRuleId) return null;
    const normalizedRule = {
      ...selectedRule,
      pricingTiers: (selectedRule.pricingTiers ?? []).map((tier) => ({
        ...tier,
        pricePerUnit: Number(tier.pricePerUnit),
      })),
    };
    return calculatePricingLocal(normalizedRule, guestCounts ?? {}, numberOfDays);
  }, [selectedRule, selectedRuleId, guestCounts, numberOfDays]);

  const onStep1Submit = (values: Step1Values) => {
    if (!selectedLocation) return;
    if (selectedLocation.requiresSpot && (!values.spotIds || values.spotIds.length === 0)) {
      setError1('spotIds', { message: t('validation.spotRequired') });
      return;
    }
    // Validate min/max days and timeslot selection per spot
    for (const spotId of values.spotIds ?? []) {
      const spot = availableSpots.find((s) => s.id === spotId);
      if (spot?.minDays != null && numberOfDays < spot.minDays) {
        setError1('spotIds', { message: t('errors.spotMinDays', { name: spot.name, count: spot.minDays }) });
        return;
      }
      if (spot?.maxDays != null && numberOfDays > spot.maxDays) {
        setError1('spotIds', { message: t('errors.spotMaxDays', { name: spot.name, count: spot.maxDays }) });
        return;
      }
      if ((spot?.timeslots ?? []).length > 0 && !spotTimeslotSelections[spotId]) {
        setError1('spotIds', { message: t('validation.timeslotRequired') });
        return;
      }
    }
    const spotTimeslots = (values.spotIds ?? []).map((spotId) => ({
      spotId,
      timeslotId: spotTimeslotSelections[spotId] ?? null,
    }));
    setFormData((prev) => ({
      ...prev,
      ...values,
      activityLocationId: selectedLocation.id,
      numberOfDays,
      spotTimeslots,
    }));
    setActiveStep(1);
  };

  const onStep2Submit = (values: Step2Values) => {
    setStep2Error(null);
    // Normalize empty pricingRuleId to undefined
    const normalizedRuleId = values.pricingRuleId || undefined;
    const submittedRule = pricingRules.find((rule) => rule.id === normalizedRuleId) ?? null;

    // Payment method validation
    if (submittedRule?.requiresPayment && !values.paymentMethod) {
      setStep2Error(t('validation.paymentMethodRequired'));
      return;
    }

    // At-least-one-guest for guest-driven pricing rules
    const isGuestDrivenRule =
      submittedRule?.pricingType === PricingType.PER_PERSON ||
      submittedRule?.pricingType === PricingType.PER_PERSON_PER_DAY;
    const totalGuests = Object.values(values.guestCounts ?? {}).reduce((s, v) => s + (v ?? 0), 0);
    if (isGuestDrivenRule && totalGuests <= 0) {
      setStep2Error(t('validation.atLeastOneGuest'));
      return;
    }

    // Pricing rule date constraints
    if (submittedRule?.minDays != null && numberOfDays < submittedRule.minDays) {
      setStep2Error(t('errors.ruleMinDays', { count: submittedRule.minDays }));
      return;
    }
    if (submittedRule?.maxDays != null && numberOfDays > submittedRule.maxDays) {
      setStep2Error(t('errors.ruleMaxDays', { count: submittedRule.maxDays }));
      return;
    }

    // Pricing rule guest count constraints
    if (submittedRule?.minPeople != null && totalGuests < submittedRule.minPeople) {
      setStep2Error(t('errors.ruleMinPeople', { count: submittedRule.minPeople }));
      return;
    }
    if (submittedRule?.maxPeople != null && totalGuests > submittedRule.maxPeople) {
      setStep2Error(t('errors.ruleMaxPeople', { count: submittedRule.maxPeople }));
      return;
    }

    const submittedGuestCounts = { ...(values.guestCounts ?? {}) };

    if (submittedRule?.pricingTiers?.length) {
      const guestCountDriven =
        submittedRule.pricingType === PricingType.PER_PERSON || submittedRule.pricingType === PricingType.PER_PERSON_PER_DAY;
      if (!guestCountDriven) {
        for (const key of Object.keys(submittedGuestCounts)) {
          submittedGuestCounts[key] = 0;
        }
        const firstKey = getPricingTierGuestKey(submittedRule.pricingTiers[0], 0);
        submittedGuestCounts[firstKey] = 1;
      }
    }

    const submittedPricing = submittedRule
      ? calculatePricingLocal(
          {
            ...submittedRule,
            pricingTiers: (submittedRule.pricingTiers ?? []).map((tier) => ({
              ...tier,
              pricePerUnit: Number(tier.pricePerUnit),
            })),
          },
          submittedGuestCounts,
          numberOfDays
        )
      : null;

    setFormData((prev) => ({
      ...prev,
      ...values,
      pricingRuleId: normalizedRuleId,
      guestCounts: submittedGuestCounts,
      pricing: submittedPricing ?? undefined,
    }));
    setActiveStep(3);
  };

  const onStep3Submit = (values: Step3Values) => {
    setFormData((prev) => ({ ...prev, ...values }));
    setActiveStep(2);
  };

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {
        activityLocationId: formData.activityLocationId,
        spotTimeslots: formData.spotTimeslots ?? (formData.spotIds ?? []).map((id) => ({ spotId: id, timeslotId: null })),
        pricingRuleId: formData.pricingRuleId ?? null,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        startDate: formData.startDate,
        endDate: formData.endDate,
        notes: formData.notes,
        guestCounts: formData.guestCounts,
        paymentMethod: formData.paymentMethod,
        embedTokenId,
        source: embedTokenId ? 'EMBED' : 'WEB',
      };

      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? t('errors.submitFailed'));

      const regNumber = json.data?.registrationNumber ?? json.registrationNumber;
      setRegistrationNumber(regNumber);
      setSubmittedEditToken(json.data?.editToken ?? null);
      setSubmittedPlaceId(selectedLocation?.place?.id ?? null);
      onSuccess?.(regNumber);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('errors.submitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const STEPS = [
    { label: t('steps.location'), icon: <CalendarMonth /> },
    { label: t('steps.contact'), icon: <Person /> },
    { label: t('steps.guests'), icon: <Group /> },
    { label: t('steps.confirm'), icon: <Payment /> },
  ];

  if (registrationNumber) {
    return (
      <Box sx={{ py: 4 }}>
        {/* Confirmation block */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <CheckCircle sx={{ fontSize: 72, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>{t('success.title')}</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>{t('success.subtitle')}</Typography>
          <Chip label={registrationNumber} color="primary" sx={{ fontSize: '1.1rem', px: 2, py: 2.5, fontWeight: 700 }} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            {t('success.emailSent', { email: formData.email })}
          </Typography>
        </Box>

        {/* Review prompt */}
        {submittedPlaceId && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, textAlign: 'center' }}>
              {t('success.leaveReview')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
              {t('success.leaveReviewSubtitle')}
            </Typography>
            <ReviewForm
              placeId={submittedPlaceId}
              activityLocationId={selectedLocation?.id}
              editToken={submittedEditToken ?? undefined}
              registrationNumber={registrationNumber}
              guestEmail={formData.email}
            />
          </Box>
        )}
      </Box>
    );
  }

  // Compute the cover image URL for the currently selected location
  const getCoverImageUrl = (loc: LocationWithDetails | null): string | null => {
    if (!loc?.gallery) return null;
    try {
      const imgs = JSON.parse(loc.gallery) as string[];
      const idx = loc.coverImageIndex ?? null;
      if (idx !== null && idx >= 0 && idx < imgs.length) return imgs[idx];
      return null;
    } catch {
      return null;
    }
  };

  const coverImageUrl = getCoverImageUrl(selectedLocation);
  const placeLogoUrl = selectedLocation?.place?.logoUrl ?? availableLocations[0]?.place?.logoUrl ?? allLocations[0]?.place?.logoUrl ?? null;
  const placeName = selectedLocation?.place?.name ?? availableLocations[0]?.place?.name ?? allLocations[0]?.place?.name ?? null;

  // â”€â”€ Activity selection screen (multi-activity places) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (hasMultipleActivityTypes && !selectedActivityTypeId) {
    return (
      <Box>
        {/* Stepper â€” step 0 highlighted */}
        <Stepper activeStep={-1} alternativeLabel sx={{ mb: 3 }}>
          {STEPS.map((step, idx) => (
            <Step key={step.label} completed={false}>
              <StepLabel
                slotProps={{
                  label: { style: { opacity: idx === 0 ? 1 : 0.38 } },
                }}
              >
                {step.label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Place branding */}
        {placeLogoUrl && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, p: 1.5, borderRadius: 2, bgcolor: 'grey.50', border: '1px solid', borderColor: 'divider' }}>
            <Box component="img" src={placeLogoUrl} alt={placeName ?? ''} sx={{ width: 44, height: 44, borderRadius: 1.5, objectFit: 'cover', border: '1px solid', borderColor: 'divider' }} />
            {placeName && <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{placeName}</Typography>}
          </Box>
        )}

        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
          {tc('stepper.selectActivity')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          {tc('stepper.selectActivityHint')}
        </Typography>

        <Grid container spacing={2}>
          {activityTypes.map((at) => {
            const locationCount = allLocations.filter((l) => {
              const types = (l as unknown as Record<string, unknown>).activityTypes as
                | Array<{ activityTypeId: string }>
                | undefined;
              return types?.some((e) => e.activityTypeId === at.id) ?? false;
            }).length;
            return (
              <Grid size={{ xs: 12, sm: 6 }} key={at.id}>
                <CardActionArea
                  onClick={() => setSelectedActivityTypeId(at.id)}
                  sx={{
                    borderRadius: 2.5,
                    border: '2px solid',
                    borderColor: 'divider',
                    overflow: 'hidden',
                    transition: 'border-color 0.18s, box-shadow 0.18s, transform 0.18s',
                    '&:hover': {
                      borderColor: '#2d5a27',
                      boxShadow: 4,
                      transform: 'translateY(-2px)',
                    },
                    '& .MuiTouchRipple-root': { color: '#2d5a27' },
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                      py: 3,
                      px: 2,
                      bgcolor:'#e8f5e9',
                      textAlign: 'center',
                    }}
                  >
                    {at.icon ? (
                      <Typography sx={{ fontSize: '2.8rem', lineHeight: 1, mb: 0.5 }}>{at.icon}</Typography>
                    ) : (
                      <Box
                        sx={{
                          width: 52,
                          height: 52,
                          borderRadius: '50%',
                          bgcolor: '#2d5a27',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mb: 0.5,
                        }}
                      >
                        <Typography sx={{ fontSize: '1.4rem', color: 'white', lineHeight: 1 }}>ðŸŒ¿</Typography>
                      </Box>
                    )}
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                      {at.name}
                    </Typography>
                    <Chip
                      label={`${locationCount} ${tc('stepper.locationsAvailable')}`}
                      size="small"
                      sx={{
                        mt: 0.5,
                        height: 22,
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        bgcolor: at.color ? `${at.color}33` : '#2d5a2722',
                        color: at.color ?? '#2d5a27',
                        border: '1px solid',
                        borderColor: at.color ? `${at.color}55` : '#2d5a2744',
                      }}
                    />
                  </Box>
                </CardActionArea>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    );
  }

  return (
    <Box>
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: hasMultipleActivityTypes ? 1.5 : 4 }}>
        {STEPS.map((step, idx) => (
          <Step key={step.label} completed={activeStep > idx}>
            <StepLabel>{step.label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Activity type breadcrumb â€” shown when an activity is already selected */}
      {hasMultipleActivityTypes && selectedActivityTypeId && (() => {
        const at = activityTypes.find((a) => a.id === selectedActivityTypeId);
        return at ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0,
              mb: 3,
              borderRadius: 2,
              overflow: 'hidden',
              border: '1.5px solid',
              borderColor: at.color ? `${at.color}55` : 'divider',
              bgcolor: at.color ? `${at.color}0f` : 'grey.50',
              width: 'fit-content',
            }}
          >
            {/* Activity pill */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                px: 1.5,
                py: 0.6,
              }}
            >
              {at.icon && (
                <Typography sx={{ fontSize: '1rem', lineHeight: 1 }}>{at.icon}</Typography>
              )}
              <Typography
                variant="caption"
                sx={{ fontWeight: 700, color: at.color ?? 'text.primary', letterSpacing: 0.2 }}
              >
                {at.name}
              </Typography>
            </Box>
            {/* Divider */}
            <Box sx={{ width: '1.5px', alignSelf: 'stretch', bgcolor: at.color ? `${at.color}44` : 'divider' }} />
            {/* Change button */}
            <Button
              size="small"
              onClick={() => {
                setSelectedActivityTypeId(null);
                setSelectedLocationId(null);
                setActiveStep(0);
              }}
              sx={{
                fontSize: '0.7rem',
                fontWeight: 600,
                px: 1.25,
                py: 0.6,
                minWidth: 'auto',
                borderRadius: 0,
                color: 'text.secondary',
                '&:hover': { bgcolor: at.color ? `${at.color}1a` : 'action.hover', color: at.color ?? 'text.primary' },
              }}
            >
              {tc('stepper.changeActivity')}
            </Button>
          </Box>
        ) : null;
      })()}

      {/* Place branding header â€” cover photo or logo bar */}
      {coverImageUrl ? (
        <Box
          sx={{
            mb: 3,
            borderRadius: 2,
            overflow: 'hidden',
            height: { xs: 160, sm: 220 },
            backgroundImage: `url(${coverImageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative',
          }}
        >
          {/* Gradient overlay with logo + location name */}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.6) 40%, transparent 100%)',
              display: 'flex',
              alignItems: 'flex-end',
              gap: 1.5,
              px: 2,
              pb: 1.5,
            }}
          >
            {placeLogoUrl && (
              <Box
                component="img"
                src={placeLogoUrl}
                alt={placeName ?? ''}
                sx={{ width: 40, height: 40, borderRadius: 1.5, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.8)', bgcolor: 'white', flexShrink: 0 }}
              />
            )}
            <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 700, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
              {(() => {
                const locTypes = (selectedLocation as unknown as Record<string, unknown> | null)?.activityTypes as
                  | Array<{ activityTypeId: string; activityType: { name: string } }>
                  | undefined;
                const actName = locTypes?.find((e) => e.activityTypeId === selectedActivityTypeId)?.activityType.name
                  ?? locTypes?.[0]?.activityType.name;
                return actName ? `${actName} â€” ` : '';
              })()}{selectedLocation?.name}
            </Typography>
          </Box>
        </Box>
      ) : placeLogoUrl ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, p: 1.5, borderRadius: 2, bgcolor: 'grey.50', border: '1px solid', borderColor: 'divider' }}>
          <Box
            component="img"
            src={placeLogoUrl}
            alt={placeName ?? ''}
            sx={{ width: 48, height: 48, borderRadius: 1.5, objectFit: 'cover', border: '1px solid', borderColor: 'divider' }}
          />
          {placeName && (
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{placeName}</Typography>
          )}
        </Box>
      ) : null}

      {/* Gallery */}
      {selectedLocation?.gallery && (() => {
        const galleryImages: string[] = (() => { try { return JSON.parse(selectedLocation.gallery!) as string[]; } catch { return []; } })();
        return galleryImages.length > 0 ? <GallerySection images={galleryImages} /> : null;
      })()}



      {activeStep === 0 && (
        <StepLocation
          availableLocations={availableLocations}
          selectedLocationId={selectedLocationId}
          onLocationSelect={setSelectedLocationId}
          locationSelectMode={locationSelectMode}
          onLocationSelectModeChange={setLocationSelectMode}
          mapSubMode={mapSubMode}
          onMapSubModeChange={setMapSubMode}
          selectedActivityTypeId={selectedActivityTypeId}
          selectedLocation={selectedLocation}
          startDate={startDate}
          endDate={endDate}
          numberOfDays={numberOfDays}
          today={today}
          startDateError={errors1.startDate?.message ? t(errors1.startDate.message) : undefined}
          endDateError={errors1.endDate?.message ? t(errors1.endDate.message) : undefined}
          onStartDateChange={(v) => setValue1('startDate', v, { shouldValidate: true })}
          onEndDateChange={(v) => setValue1('endDate', v, { shouldValidate: true })}
          availableSpots={availableSpots}
          availabilityLoading={availabilityLoading}
          availabilityError={availabilityError}
          selectedSpotIds={selectedSpotIds ?? []}
          spotTimeslotSelections={spotTimeslotSelections}
          spotError={errors1.spotIds?.message}
          onSpotToggle={handleSpotToggle}
          onSelectTimeslot={selectTimeslot}
          onFormSubmit={handleSubmit1(onStep1Submit)}
        />
      )}


      {activeStep === 1 && (
        <StepContact
          register={register3}
          errors={errors3}
          onFormSubmit={handleSubmit3(onStep3Submit)}
          onBack={() => setActiveStep(0)}
        />
      )}

      {activeStep === 2 && (
        <StepGuestsPayment
          control={control2}
          pricingRules={pricingRules}
          selectedRule={selectedRule}
          dynamicGuestFields={dynamicGuestFields}
          isGuestCountRule={isGuestCountRule}
          livePricing={livePricing}
          guestCounts={guestCounts ?? {}}
          step2Error={step2Error}
          onFormSubmit={handleSubmit2(onStep2Submit)}
          onBack={() => setActiveStep(1)}
          formatGuestSummary={formatGuestSummary}
        />
      )}

      {activeStep === 3 && (
        <StepConfirm
          formData={formData}
          selectedLocation={selectedLocation}
          availableSpots={availableSpots}
          numberOfDays={numberOfDays}
          livePricing={livePricing}
          summaryUsesGuestCounts={summaryUsesGuestCounts}
          submitError={submitError}
          submitting={submitting}
          onBack={() => setActiveStep(2)}
          onConfirm={handleFinalSubmit}
          formatGuestSummary={formatGuestSummary}
        />
      )}
    </Box>
  );
}
