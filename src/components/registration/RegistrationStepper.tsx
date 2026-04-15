'use client';

import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Divider,
  Alert,
  CircularProgress,
  Grid,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
  Paper,
  Chip,
  Card,
  CardActionArea,
  CardContent,
  Checkbox,
  Stack,
  Dialog,
  DialogContent,
  Fade,
  IconButton,
} from '@mui/material';
import DateRangePicker from '@/components/ui/DateRangePicker';
import {
  CalendarMonth,
  Group,
  Person,
  Payment,
  CheckCircle,
  Map as MapIcon,
  ViewList,
  PhotoLibrary,
  ChevronLeft,
  ChevronRight,
  Close,
} from '@mui/icons-material';
import dynamic from 'next/dynamic';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from '@/i18n/client';

const LocationMap = dynamic(
  () => import('@/components/map/LocationMap'),
  { ssr: false, loading: () => null }
);
import { format, differenceInCalendarDays, addDays } from 'date-fns';
import type { SpotMapItem } from '@/components/map/SpotMap';
import { calculatePricing as calculatePricingLocal, getPricingTierGuestKey, formatGuestSummary } from '@/lib/pricing';
import {
  ActivityLocation,
  PricingRule,
  PricingCalculation,
  PaymentMethod,
  PricingType,
  RegistrationFormData,
} from '@/types';
import ReviewForm from '@/components/reviews/ReviewForm';

const step1Schema = z
  .object({
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    spotIds: z.array(z.string()),
  })
  .refine((d) => new Date(d.endDate) > new Date(d.startDate), {
    message: 'End date must be after start date',
    path: ['endDate'],
  });

const step2Schema = z.object({
  guestCounts: z.record(z.string(), z.number().int().min(0)),
  pricingRuleId: z.string().optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  notes: z.string().optional(),
});

const step3Schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type Step1Values = z.infer<typeof step1Schema>;
type Step2Values = z.infer<typeof step2Schema>;
type Step3Values = z.infer<typeof step3Schema>;

type LocationWithDetails = ActivityLocation & {
  place?: { name: string; id: string; slug: string; logoUrl?: string | null };
  spots?: SpotMapItem[];
  pricingRules?: PricingRule[];
};

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
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIdx, setGalleryIdx] = useState(0);

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

  // Which map modes are available
  const hasVirtualMap = availableLocations.some((loc) => !!loc.svgMapData);
  const hasRealMap = availableLocations.some(
    (loc) => loc.latitude != null && loc.longitude != null
  );
  const gpsLocations = availableLocations.filter(
    (loc): loc is typeof loc & { latitude: number; longitude: number } =>
      loc.latitude != null && loc.longitude != null
  );
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const selectedLocation = availableLocations.find((loc) => loc.id === selectedLocationId) ?? null;

  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [availableSpots, setAvailableSpots] = useState<(SpotMapItem & { isAvailable?: boolean })[]>([]);

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

  const parseLocationZone = (svgMapData?: string | null) => {
    if (!svgMapData) return null;
    try {
      const parsed = JSON.parse(svgMapData) as { type?: string; cx?: number; cy?: number; r?: number };
      if (parsed.type !== 'circle') return null;
      if (typeof parsed.cx !== 'number' || typeof parsed.cy !== 'number') return null;
      return { cx: parsed.cx, cy: parsed.cy, r: parsed.r ?? 28 };
    } catch {
      return null;
    }
  };

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
          throw new Error(json.error ?? 'Failed to check spot availability');
        }

        const fetched = (json.data ?? []) as (SpotMapItem & { isAvailable?: boolean })[];
        setAvailableSpots(fetched);

        const stillAvailableIds = new Set(
          fetched.filter((s) => s.isAvailable !== false).map((s) => s.id)
        );
        setValue1('spotIds', (selectedSpotIds ?? []).filter((id) => stillAvailableIds.has(id)));
      } catch (err) {
        setAvailabilityError(err instanceof Error ? err.message : 'Failed to check spot availability');
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
    setFormData((prev) => ({
      ...prev,
      ...values,
      activityLocationId: selectedLocation.id,
      numberOfDays,
    }));
    setActiveStep(1);
  };

  const onStep2Submit = (values: Step2Values) => {
    // Normalize empty pricingRuleId to undefined
    const normalizedRuleId = values.pricingRuleId || undefined;
    const submittedRule = pricingRules.find((rule) => rule.id === normalizedRuleId) ?? null;

    // Client-side payment method validation
    if (submittedRule?.requiresPayment && !values.paymentMethod) {
      return; // ToggleButtonGroup already shows the options; this guards accidental bypass
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
        spotIds: formData.spotIds,
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
      if (!res.ok) throw new Error(json.error ?? 'Registration failed');

      const regNumber = json.data?.registrationNumber ?? json.registrationNumber;
      setRegistrationNumber(regNumber);
      setSubmittedEditToken(json.data?.editToken ?? null);
      setSubmittedPlaceId(selectedLocation?.place?.id ?? null);
      onSuccess?.(regNumber);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'An error occurred');
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

  // ── Activity selection screen (multi-activity places) ───────────────
  if (hasMultipleActivityTypes && !selectedActivityTypeId) {
    return (
      <Box>
        {/* Stepper — step 0 highlighted */}
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
                        <Typography sx={{ fontSize: '1.4rem', color: 'white', lineHeight: 1 }}>🌿</Typography>
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

      {/* Activity type breadcrumb — shown when an activity is already selected */}
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

      {/* Place branding header — cover photo or logo bar */}
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
                return actName ? `${actName} — ` : '';
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

      {/* Gallery — grid preview + lightbox */}
      {(() => {
        const galleryImages: string[] = [];
        if (selectedLocation?.gallery) {
          try { galleryImages.push(...(JSON.parse(selectedLocation.gallery) as string[])); } catch { /* ignore */ }
        }
        if (galleryImages.length === 0) return null;
        return (
          <Box sx={{ mb: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <PhotoLibrary sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  {tc('stepper.photos')} ({galleryImages.length})
                </Typography>
              </Box>
              {galleryImages.length > 3 && (
                <Button
                  size="small"
                  onClick={() => { setGalleryIdx(0); setGalleryOpen(true); }}
                  sx={{ fontSize: '0.72rem', py: 0, minWidth: 'auto', color: 'text.secondary' }}
                >
                  +{galleryImages.length - 3} more
                </Button>
              )}
            </Box>

            {/* Grid preview */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: galleryImages.length === 1 ? '1fr' : galleryImages.length === 2 ? '1fr 1fr' : '2fr 1fr',
                gridTemplateRows: galleryImages.length >= 3 ? '120px 120px' : '160px',
                gap: 0.75,
                borderRadius: 1.5,
                overflow: 'hidden',
              }}
            >
              {/* Image 1 */}
              <Box
                onClick={() => { setGalleryIdx(0); setGalleryOpen(true); }}
                sx={{ gridRow: galleryImages.length >= 3 ? 'span 2' : 'auto', position: 'relative', overflow: 'hidden', cursor: 'pointer', '&:hover img': { transform: 'scale(1.04)' } }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={galleryImages[0]} alt="photo 1" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s' }} />
              </Box>
              {/* Image 2 */}
              {galleryImages.length >= 2 && (
                <Box
                  onClick={() => { setGalleryIdx(1); setGalleryOpen(true); }}
                  sx={{ position: 'relative', overflow: 'hidden', cursor: 'pointer', '&:hover img': { transform: 'scale(1.04)' } }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={galleryImages[1]} alt="photo 2" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s' }} />
                </Box>
              )}
              {/* Image 3 — with +N overlay */}
              {galleryImages.length >= 3 && (
                <Box
                  onClick={() => { setGalleryIdx(2); setGalleryOpen(true); }}
                  sx={{ position: 'relative', overflow: 'hidden', cursor: 'pointer', '&:hover img': { transform: 'scale(1.04)' } }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={galleryImages[2]} alt="photo 3" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s' }} />
                  {galleryImages.length > 3 && (
                    <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.52)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Typography variant="h6" sx={{ color: 'white', fontWeight: 800 }}>+{galleryImages.length - 3}</Typography>
                    </Box>
                  )}
                </Box>
              )}
            </Box>

            {/* Lightbox */}
            <Dialog
              open={galleryOpen}
              onClose={() => setGalleryOpen(false)}
              maxWidth={false}
              slotProps={{ paper: { sx: { bgcolor: 'rgba(0,0,0,0.95)', borderRadius: 0, m: 0, maxWidth: '100vw', width: '100vw', height: '100vh', maxHeight: '100vh' } } }}
            >
              <DialogContent sx={{ p: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', position: 'relative' }}>
                <IconButton
                  onClick={() => setGalleryOpen(false)}
                  sx={{ position: 'absolute', top: 16, right: 16, color: 'white', bgcolor: 'rgba(255,255,255,0.12)', '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' }, zIndex: 10 }}
                >
                  <Close />
                </IconButton>
                <Typography variant="caption" sx={{ position: 'absolute', top: 22, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.7)', zIndex: 10 }}>
                  {galleryIdx + 1} / {galleryImages.length}
                </Typography>
                {galleryImages.length > 1 && (
                  <IconButton
                    onClick={() => setGalleryIdx((i) => (i - 1 + galleryImages.length) % galleryImages.length)}
                    sx={{ position: 'absolute', left: 16, color: 'white', bgcolor: 'rgba(255,255,255,0.12)', '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' }, zIndex: 10 }}
                  >
                    <ChevronLeft sx={{ fontSize: 36 }} />
                  </IconButton>
                )}
                <Fade in key={galleryIdx}>
                  <Box sx={{ maxWidth: '90vw', maxHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={galleryImages[galleryIdx]}
                      alt={`photo ${galleryIdx + 1}`}
                      style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 8 }}
                    />
                  </Box>
                </Fade>
                {galleryImages.length > 1 && (
                  <IconButton
                    onClick={() => setGalleryIdx((i) => (i + 1) % galleryImages.length)}
                    sx={{ position: 'absolute', right: 16, color: 'white', bgcolor: 'rgba(255,255,255,0.12)', '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' }, zIndex: 10 }}
                  >
                    <ChevronRight sx={{ fontSize: 36 }} />
                  </IconButton>
                )}
                {galleryImages.length > 1 && (
                  <Stack
                    direction="row"
                    spacing={0.75}
                    sx={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', maxWidth: '80vw', overflowX: 'auto', pb: 0.5 }}
                  >
                    {galleryImages.map((src, i) => (
                      <Box
                        key={i}
                        onClick={() => setGalleryIdx(i)}
                        sx={{
                          width: 52, height: 36, borderRadius: 1, overflow: 'hidden', cursor: 'pointer', flexShrink: 0,
                          border: '2px solid', borderColor: i === galleryIdx ? 'white' : 'transparent',
                          opacity: i === galleryIdx ? 1 : 0.55,
                          transition: 'opacity 0.2s, border-color 0.2s',
                          '&:hover': { opacity: 1 },
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt={`thumb ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      </Box>
                    ))}
                  </Stack>
                )}
              </DialogContent>
            </Dialog>
          </Box>
        );
      })()}

      {activeStep === 0 && (
        <Box component="form" onSubmit={handleSubmit1(onStep1Submit)}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <ToggleButtonGroup
              value={locationSelectMode}
              exclusive
              onChange={(_, value) => {
                if (!value) return;
                setLocationSelectMode(value);
                // Default sub-mode: real map if no virtual map exists
                if (value === 'map' && !hasVirtualMap && hasRealMap) setMapSubMode('real');
                if (value === 'map' && hasVirtualMap) setMapSubMode('virtual');
              }}
              size="small"
            >
              <ToggleButton value="list"><ViewList sx={{ mr: 0.75 }} fontSize="small" /> {tc('stepper.selectionList')}</ToggleButton>
              <ToggleButton value="map"><MapIcon sx={{ mr: 0.75 }} fontSize="small" /> {tc('stepper.selectOnMap')}</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {locationSelectMode === 'list' && (
            <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
              {availableLocations.map((loc) => {
                const selected = selectedLocationId === loc.id;
                // Find the display name for the selected activity type
                const locTypes = (loc as unknown as Record<string, unknown>).activityTypes as
                  | Array<{ activityTypeId: string; activityType: { name: string } }>
                  | undefined;
                const displayActivityName = locTypes?.find((e) => e.activityTypeId === selectedActivityTypeId)?.activityType.name
                  ?? locTypes?.[0]?.activityType.name
                  ?? 'Activity';
                return (
                  <Grid size={{ xs: 12, sm: 6 }} key={loc.id}>
                    <Card
                      variant={selected ? 'elevation' : 'outlined'}
                      sx={{
                        borderRadius: 2,
                        border: '2px solid',
                        borderColor: selected ? '#2d5a27' : 'divider',
                      }}
                    >
                      <CardActionArea onClick={() => setSelectedLocationId(loc.id)}>
                        <CardContent>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {displayActivityName} — {loc.name}
                          </Typography>
                          {loc.description && (
                            <Typography variant="caption" color="text.secondary">{loc.description}</Typography>
                          )}
                          {selected && <Chip size="small" label={tc('stepper.selected')} sx={{ mt: 1.5, mb: 0.5, mx: 1, bgcolor: '#2d5a27', color: 'white' }} />}
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}

          {locationSelectMode === 'map' && (
            <Box sx={{ mb: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
              {/* Sub-mode toggle when both virtual and real maps are available */}
              {hasVirtualMap && hasRealMap && (
                <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                  <ToggleButtonGroup
                    value={mapSubMode}
                    exclusive
                    onChange={(_, v) => v && setMapSubMode(v)}
                    size="small"
                  >
                    <ToggleButton value="virtual">{tc('stepper.virtualMap')}</ToggleButton>
                    <ToggleButton value="real">{tc('stepper.realMap')}</ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              )}

              {/* Real-world Leaflet map */}
              {(hasRealMap && (!hasVirtualMap || mapSubMode === 'real')) && (
                <Box>
                  {!hasVirtualMap && (
                    <Typography variant="caption" sx={{ display: 'block', px: 1.5, py: 0.75, color: 'text.secondary', borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                      {tc('stepper.clickPinToSelect')}
                    </Typography>
                  )}
                  <LocationMap
                    pins={gpsLocations.map((loc) => {
                      const locTypes = (loc as unknown as Record<string, unknown>).activityTypes as
                        | Array<{ activityTypeId: string; activityType: { name: string } }>
                        | undefined;
                      const pinActivityName = locTypes?.find((e) => e.activityTypeId === selectedActivityTypeId)?.activityType.name
                        ?? locTypes?.[0]?.activityType.name
                        ?? 'Activity';
                      return {
                        id: loc.id,
                        name: `${pinActivityName} — ${loc.name}`,
                        description: loc.description ?? undefined,
                        latitude: loc.latitude,
                        longitude: loc.longitude,
                        color: selectedLocationId === loc.id ? '#0d47a1' : '#1b5e20',
                      };
                    })}
                    height={360}
                    onPinClick={(id) => setSelectedLocationId(id)}
                  />
                  {selectedLocationId && (
                    <Box sx={{ px: 1.5, py: 1, bgcolor: '#e8f5e9', borderTop: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="caption" sx={{ color: '#2d5a27', fontWeight: 700 }}>
                        Selected: {availableLocations.find((l) => l.id === selectedLocationId)?.name}
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}

              {/* Virtual SVG map */}
              {(hasVirtualMap && (!hasRealMap || mapSubMode === 'virtual')) && (
                <Box>
                  <Box
                    sx={{
                      px: 1.5,
                      py: 1,
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 1,
                      alignItems: 'center',
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'background.paper',
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 700, mr: 0.5 }}>
                      {tc('stepper.legend')}
                    </Typography>
                    <Chip
                      size="small"
                      label={tc('stepper.selectable')}
                      sx={{
                        bgcolor: '#1b5e20',
                        color: 'white',
                        fontWeight: 700,
                        '& .MuiChip-label': { px: 1.25 },
                      }}
                    />
                    <Chip
                      size="small"
                      label={tc('stepper.selected')}
                      sx={{
                        bgcolor: '#0d47a1',
                        color: 'white',
                        fontWeight: 700,
                        border: '2px solid #ffeb3b',
                        '& .MuiChip-label': { px: 1.25 },
                      }}
                    />
                  </Box>
                  <svg
                    viewBox={`0 0 ${selectedLocation?.mapWidth ?? 900} ${selectedLocation?.mapHeight ?? 600}`}
                    style={{ width: '100%', height: 'auto', display: 'block', background: '#f0ebe3' }}
                  >
                    {(availableLocations.find((loc) => !!loc.mapImageUrl)?.mapImageUrl || selectedLocation?.mapImageUrl) && (
                      <image
                        href={availableLocations.find((loc) => !!loc.mapImageUrl)?.mapImageUrl || selectedLocation?.mapImageUrl || ''}
                        x={0}
                        y={0}
                        width={selectedLocation?.mapWidth ?? 900}
                        height={selectedLocation?.mapHeight ?? 600}
                        preserveAspectRatio="xMidYMid slice"
                      />
                    )}
                    {availableLocations.map((loc) => {
                      const zone = parseLocationZone(loc.svgMapData);
                      if (!zone) return null;
                      const selected = selectedLocationId === loc.id;
                      const baseRadius = zone.r;
                      return (
                        <g key={loc.id} onClick={() => setSelectedLocationId(loc.id)} style={{ cursor: 'pointer' }}>
                          <circle
                            cx={zone.cx}
                            cy={zone.cy}
                            r={selected ? baseRadius + 8 : baseRadius + 5}
                            fill="rgba(0,0,0,0.18)"
                          />
                          <circle
                            cx={zone.cx}
                            cy={zone.cy}
                            r={selected ? baseRadius + 5 : baseRadius + 2}
                            fill="none"
                            stroke={selected ? '#ffeb3b' : 'rgba(255,255,255,0.95)'}
                            strokeWidth={selected ? 4 : 3}
                          />
                          <circle
                            cx={zone.cx}
                            cy={zone.cy}
                            r={baseRadius}
                            fill={selected ? '#0d47a1' : '#1b5e20'}
                            fillOpacity={selected ? 0.95 : 0.82}
                            stroke="white"
                            strokeWidth={selected ? 3 : 2}
                          />
                          {selected && (
                            <text
                              x={zone.cx}
                              y={zone.cy + 4}
                              textAnchor="middle"
                              fill="white"
                              fontSize={14}
                              fontWeight={900}
                              stroke="rgba(0,0,0,0.55)"
                              strokeWidth={2}
                              paintOrder="stroke"
                            >
                              ✓
                            </text>
                          )}
                          <text
                            x={zone.cx}
                            y={zone.cy + baseRadius + 16}
                            textAnchor="middle"
                            fill={selected ? '#0d47a1' : 'rgba(0,0,0,0.9)'}
                            fontSize={selected ? 12 : 11}
                            fontWeight={selected ? 900 : 700}
                            stroke="rgba(255,255,255,0.98)"
                            strokeWidth={4}
                            paintOrder="stroke"
                          >
                            {selected ? `${tc('stepper.selected')}: ${loc.name}` : loc.name}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </Box>
              )}

              {/* Fallback: no map data at all */}
              {!hasVirtualMap && !hasRealMap && (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    {tc('stepper.noMapAvailable')}
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {!selectedLocation && (
            <Alert severity="warning" sx={{ mb: 2.5 }}>
              Select a location first from selection list or map.
            </Alert>
          )}

          {/* Show location instructions if available */}
          {selectedLocation?.instructions && (
            <Alert
              severity="info"
              icon={<MapIcon />}
              sx={{ mb: 2.5, '& .MuiAlert-message': { width: '100%' } }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                {t('locationInstructions')}
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                {selectedLocation.instructions}
              </Typography>
            </Alert>
          )}

          <Box sx={{ mb: 3 }}>
            <DateRangePicker
              fromValue={startDate}
              toValue={endDate}
              onFromChange={(v) => setValue1('startDate', v, { shouldValidate: true })}
              onToChange={(v) => setValue1('endDate', v, { shouldValidate: true })}
              fromError={errors1.startDate?.message}
              toError={errors1.endDate?.message}
              minFrom={today}
            />
          </Box>

          {selectedLocation?.requiresSpot && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
                {t('steps.spotSelection')}
              </Typography>
              {availabilityError && <Alert severity="error" sx={{ mb: 1.5 }}>{availabilityError}</Alert>}
              {errors1.spotIds && <Alert severity="warning" sx={{ mb: 1.5 }}>{errors1.spotIds.message}</Alert>}
              {availabilityLoading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={18} />
                  <Typography variant="body2" color="text.secondary">Checking spot availability…</Typography>
                </Box>
              ) : (
                <Stack spacing={1}>
                  {availableSpots.filter((s) => s.isAvailable !== false).length === 0 ? (
                    <Alert severity="info">{tc('stepper.noAvailableSpots')}</Alert>
                  ) : (
                    availableSpots
                      .filter((s) => s.isAvailable !== false)
                      .map((spot) => {
                        const checked = (selectedSpotIds ?? []).includes(spot.id);
                        return (
                          <Card key={spot.id} variant="outlined" sx={{ borderRadius: 2 }}>
                            <CardActionArea onClick={() => handleSpotToggle(spot)}>
                              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                    {spot.name}{spot.code ? ` (${spot.code})` : ''}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">{tc('stepper.maxPeople', { count: spot.maxPeople })}</Typography>
                                </Box>
                                <Checkbox checked={checked} />
                              </CardContent>
                            </CardActionArea>
                          </Card>
                        );
                      })
                  )}
                </Stack>
              )}
            </Box>
          )}

          <Button type="submit" variant="contained" fullWidth size="large" disabled={!selectedLocation || availabilityLoading || !!(selectedLocation?.requiresSpot && (selectedSpotIds ?? []).length === 0)}>
            {t('actions.continue')}
          </Button>
        </Box>
      )}

      {activeStep === 1 && (
        <Box component="form" onSubmit={handleSubmit3(onStep3Submit)}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField {...register3('firstName')} label={t('fields.firstName')} fullWidth error={!!errors3.firstName} helperText={errors3.firstName?.message} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField {...register3('lastName')} label={t('fields.lastName')} fullWidth error={!!errors3.lastName} helperText={errors3.lastName?.message} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField {...register3('email')} label={t('fields.email')} type="email" fullWidth error={!!errors3.email} helperText={errors3.email?.message} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField {...register3('phone')} label={t('fields.phone')} fullWidth slotProps={{ input: { startAdornment: <InputAdornment position="start">📞</InputAdornment> } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField {...register3('address')} label={t('fields.address')} fullWidth />
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="outlined" onClick={() => setActiveStep(0)} fullWidth>{t('actions.back')}</Button>
            <Button type="submit" variant="contained" fullWidth size="large">{t('actions.continue')}</Button>
          </Box>
        </Box>
      )}

      {activeStep === 2 && (
        <Box component="form" onSubmit={handleSubmit2(onStep2Submit)}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>{t('fields.guestCounts')}</Typography>
          {isGuestCountRule ? (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {dynamicGuestFields.map(({ key, label }) => (
                <Grid size={{ xs: 6, sm: 3 }} key={key}>
                  <Controller
                    name={`guestCounts.${key}`}
                    control={control2}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        label={label}
                        type="number"
                        fullWidth
                        slotProps={{ htmlInput: { min: 0 } }}
                        size="small"
                      />
                    )}
                  />
                </Grid>
              ))}
            </Grid>
          ) : (
            <Alert severity="info" sx={{ mb: 3 }}>
              {tc('stepper.fixedRatePricing')}
            </Alert>
          )}

          {pricingRules.length > 0 && (
            <Controller
              name="pricingRuleId"
              control={control2}
              render={({ field }) => (
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>{t('fields.pricingRule')}</InputLabel>
                  <Select {...field} label={t('fields.pricingRule')}>
                    {pricingRules.map((rule) => (
                      <MenuItem key={rule.id} value={rule.id}>{rule.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />
          )}

          {pricingRules.length > 0 && selectedRule?.requiresPayment && (
            <Controller
              name="paymentMethod"
              control={control2}
              render={({ field }) => (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                    {t('fields.paymentMethod')}
                  </Typography>
                  <ToggleButtonGroup
                    value={field.value}
                    exclusive
                    onChange={(_, val) => val && field.onChange(val)}
                    size="small"
                  >
                    {(selectedRule?.paymentMethod === PaymentMethod.BOTH || selectedRule?.paymentMethod === PaymentMethod.CASH) && (
                      <ToggleButton value={PaymentMethod.CASH}>💵 {t('paymentMethods.cash')}</ToggleButton>
                    )}
                    {(selectedRule?.paymentMethod === PaymentMethod.BOTH || selectedRule?.paymentMethod === PaymentMethod.CARD) && (
                      <ToggleButton value={PaymentMethod.CARD}>💳 {t('paymentMethods.card')}</ToggleButton>
                    )}
                  </ToggleButtonGroup>
                </Box>
              )}
            />
          )}

          {pricingRules.length > 0 && selectedRule && !selectedRule.requiresPayment && (
            <Alert severity="success" sx={{ mb: 2 }}>
              ✅ {tc('stepper.noPaymentRequired')}
            </Alert>
          )}

          {pricingRules.length === 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {tc('stepper.noPricingRule')}
            </Alert>
          )}

          {livePricing && (
            <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                {t('pricing.breakdown')}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Guests: {formatGuestSummary(guestCounts ?? {})}
              </Typography>
              {livePricing.breakdown.map((item, i) => (
                <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                  <Box>
                    <Typography variant="body2">{item.label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.quantity} × {livePricing.currency} {item.unitPrice.toFixed(2)}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {livePricing.currency} {item.totalPrice.toFixed(2)}
                  </Typography>
                </Box>
              ))}
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2">{t('pricing.total')}</Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#2d5a27' }}>
                  {livePricing.currency} {Number(livePricing.totalAmount).toFixed(2)}
                </Typography>
              </Box>
            </Paper>
          )}

          <Controller
            name="notes"
            control={control2}
            render={({ field }) => (
              <TextField
                {...field}
                label={t('fields.notes')}
                multiline
                rows={3}
                fullWidth
                sx={{ mb: 3 }}
                placeholder={t('fields.notesPlaceholder')}
              />
            )}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="outlined" onClick={() => setActiveStep(1)} fullWidth>{t('actions.back')}</Button>
            <Button type="submit" variant="contained" fullWidth size="large">{t('actions.continue')}</Button>
          </Box>
        </Box>
      )}

      {activeStep === 3 && (
        <Box>
          <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>{t('confirm.summaryTitle')}</Typography>

            {selectedLocation && (
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Location</Typography>
                <Typography variant="body2">{selectedLocation.name}</Typography>
              </Box>
            )}

            <Box sx={{ mb: 1.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{t('fields.dates')}</Typography>
              <Typography variant="body2">{formData.startDate} → {formData.endDate} ({numberOfDays} {t('fields.nights')})</Typography>
            </Box>

            {(formData.spotIds?.length ?? 0) > 0 && (
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{t('fields.selectedSpots')}</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                  {availableSpots
                    .filter((s) => formData.spotIds?.includes(s.id))
                    .map((s) => <Chip key={s.id} label={s.name} size="small" />)}
                </Box>
              </Box>
            )}

            {(formData.pricing ?? livePricing) && (
              <>
                <Divider sx={{ my: 1.5 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  {t('pricing.breakdown')}
                </Typography>
                {summaryUsesGuestCounts ? (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    Guests: {formatGuestSummary((formData.guestCounts ?? guestCounts ?? {}) as Record<string, number>)}
                  </Typography>
                ) : (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    {tc('stepper.fixedRatePricing')}
                  </Typography>
                )}
                {(formData.pricing ?? livePricing)?.breakdown?.map((item, index) => (
                  <Box key={`${item.label}-${index}`} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.35 }}>
                    <Box>
                      <Typography variant="body2">{item.label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.quantity} × {(formData.pricing ?? livePricing)?.currency} {item.unitPrice.toFixed(2)}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {(formData.pricing ?? livePricing)?.currency} {item.totalPrice.toFixed(2)}
                    </Typography>
                  </Box>
                ))}
                <Divider sx={{ my: 1.2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle2">{t('pricing.total')}</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#2d5a27' }}>
                    {(formData.pricing ?? livePricing)?.currency}{' '}
                    {(formData.pricing ?? livePricing)?.totalAmount?.toFixed(2)}
                  </Typography>
                </Box>
                {formData.paymentMethod && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">Payment method: </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      {formData.paymentMethod === PaymentMethod.CASH ? '💵 Cash' : '💳 Card'}
                    </Typography>
                  </Box>
                )}
              </>
            )}

            {summaryRule && !summaryRule.requiresPayment && (
              <Alert severity="success" sx={{ mt: 1.5 }}>
                ✅ {tc('stepper.noPaymentRequired')}
              </Alert>
            )}
          </Paper>

          {submitError && <Alert severity="error" sx={{ mb: 2 }}>{submitError}</Alert>}

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="outlined" onClick={() => setActiveStep(2)} fullWidth disabled={submitting}>{t('actions.back')}</Button>
            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={handleFinalSubmit}
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <CheckCircle />}
            >
              {submitting ? t('actions.submitting') : t('actions.confirm')}
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}
