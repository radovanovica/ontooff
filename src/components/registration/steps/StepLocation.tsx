'use client';

import {
  Box,
  Typography,
  Alert,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Checkbox,
  Stack,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
  Collapse,
  Grid,
} from '@mui/material';
import {
  Map as MapIcon,
  ViewList,
  LocationOn,
  CheckCircle,
  AccessTime,
  WbSunny,
} from '@mui/icons-material';
import dynamic from 'next/dynamic';
import { useTranslation } from '@/i18n/client';
import DateRangePicker from '@/components/ui/DateRangePicker';
import type { SpotMapItem } from '@/components/map/SpotMap';
import type { LocationWithDetails, AvailableSpot } from '../types';

const LocationMap = dynamic(
  () => import('@/components/map/LocationMap'),
  { ssr: false, loading: () => null }
);

// ── helpers ──────────────────────────────────────────────────────────────────

function parseLocationZone(svgMapData?: string | null) {
  if (!svgMapData) return null;
  try {
    const parsed = JSON.parse(svgMapData) as { type?: string; cx?: number; cy?: number; r?: number };
    if (parsed.type !== 'circle') return null;
    if (typeof parsed.cx !== 'number' || typeof parsed.cy !== 'number') return null;
    return { cx: parsed.cx, cy: parsed.cy, r: parsed.r ?? 28 };
  } catch {
    return null;
  }
}

// ── section block ─────────────────────────────────────────────────────────────

interface SectionBlockProps {
  number: number;
  title: string;
  done: boolean;
  summary?: string;
  children: React.ReactNode;
}

function SectionBlock({ number, title, done, summary, children }: SectionBlockProps) {
  return (
    <Box sx={{ mb: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.5 }}>
        <Box sx={{
          width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', fontWeight: 700,
          bgcolor: done ? 'success.main' : 'primary.main', color: 'white',
          transition: 'background-color 0.3s',
        }}>
          {done ? '✓' : number}
        </Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, flex: 1 }}>{title}</Typography>
        {done && summary && (
          <Chip
            size="small"
            label={summary}
            color="success"
            variant="outlined"
            sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600 }}
          />
        )}
      </Box>
      {children}
    </Box>
  );
}

// ── main component ────────────────────────────────────────────────────────────

interface StepLocationProps {
  // Locations
  availableLocations: LocationWithDetails[];
  selectedLocationId: string | null;
  onLocationSelect: (id: string) => void;
  locationSelectMode: 'list' | 'map';
  onLocationSelectModeChange: (mode: 'list' | 'map') => void;
  mapSubMode: 'virtual' | 'real';
  onMapSubModeChange: (mode: 'virtual' | 'real') => void;
  selectedActivityTypeId: string | null;
  selectedLocation: LocationWithDetails | null;
  // Dates
  startDate: string;
  endDate: string;
  numberOfDays: number;
  today: string;
  startDateError?: string;
  endDateError?: string;
  onStartDateChange: (v: string) => void;
  onEndDateChange: (v: string) => void;
  // Spots
  availableSpots: AvailableSpot[];
  availabilityLoading: boolean;
  availabilityError: string | null;
  selectedSpotIds: string[];
  spotTimeslotSelections: Record<string, string>;
  spotError?: string;
  onSpotToggle: (spot: SpotMapItem) => void;
  onSelectTimeslot: (spotId: string, timeslotId: string) => void;
  // Submit action (called by the Continue button)
  onFormSubmit: React.FormEventHandler<HTMLFormElement>;
}

export default function StepLocation({
  availableLocations,
  selectedLocationId,
  onLocationSelect,
  locationSelectMode,
  onLocationSelectModeChange,
  mapSubMode,
  onMapSubModeChange,
  selectedActivityTypeId,
  selectedLocation,
  startDate,
  endDate,
  numberOfDays,
  today,
  startDateError,
  endDateError,
  onStartDateChange,
  onEndDateChange,
  availableSpots,
  availabilityLoading,
  availabilityError,
  selectedSpotIds,
  spotTimeslotSelections,
  spotError,
  onSpotToggle,
  onSelectTimeslot,
  onFormSubmit,
}: StepLocationProps) {
  const { t } = useTranslation('registration');
  const { t: tc } = useTranslation('common');

  const hasVirtualMap = availableLocations.some((loc) => !!loc.svgMapData);
  const hasRealMap = availableLocations.some((loc) => loc.latitude != null && loc.longitude != null);

  // Use dimensions from the first location that has them (not selected location,
  // so the map renders correctly even before a location is chosen)
  const mapDimSource = availableLocations.find((l) => !!l.mapWidth && !!l.mapHeight) ?? availableLocations[0];
  const svgWidth = mapDimSource?.mapWidth ?? 900;
  const svgHeight = mapDimSource?.mapHeight ?? 600;
  const gpsLocations = availableLocations.filter(
    (loc): loc is typeof loc & { latitude: number; longitude: number } =>
      loc.latitude != null && loc.longitude != null
  );

  // Progressive unlock conditions
  const datesUnlocked = !!selectedLocation;
  const spotsUnlocked = datesUnlocked &&
    !!startDate && !!endDate &&
    new Date(endDate) > new Date(startDate);

  // Summary for completed sections
  const locationSummary = selectedLocation?.name;
  const datesSummary = spotsUnlocked
    ? `${numberOfDays} ${t('fields.nights')}`
    : undefined;
  const spotsSummary = (selectedSpotIds.length > 0)
    ? availableSpots.filter((s) => selectedSpotIds.includes(s.id)).map((s) => s.name).join(', ')
    : undefined;

  return (
    <Box component="form" onSubmit={onFormSubmit}>
      <Stack spacing={0} divider={<Box sx={{ height: '1px', bgcolor: 'divider', my: 2 }} />}>

        {/* ── Section 1: Location ──────────────────────────────────────── */}
        <SectionBlock
          number={1}
          title={t('step1.heading')}
          done={!!selectedLocation}
          summary={locationSummary}
        >
          {/* List / Map toggle */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
            <ToggleButtonGroup
              value={locationSelectMode}
              exclusive
              onChange={(_, value) => {
                if (!value) return;
                onLocationSelectModeChange(value);
                if (value === 'map' && !hasVirtualMap && hasRealMap) onMapSubModeChange('real');
                if (value === 'map' && hasVirtualMap) onMapSubModeChange('virtual');
              }}
              size="small"
            >
              <ToggleButton value="list">
                <ViewList sx={{ mr: 0.75 }} fontSize="small" />
                {tc('stepper.selectionList')}
              </ToggleButton>
              <ToggleButton value="map">
                <MapIcon sx={{ mr: 0.75 }} fontSize="small" />
                {tc('stepper.selectOnMap')}
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* List view */}
          {locationSelectMode === 'list' && (
            <Grid container spacing={1.5}>
              {availableLocations.map((loc) => {
                const selected = selectedLocationId === loc.id;
                const locTypes = (loc as unknown as Record<string, unknown>).activityTypes as
                  | Array<{ activityTypeId: string; activityType: { name: string } }>
                  | undefined;
                const displayActivityName =
                  locTypes?.find((e) => e.activityTypeId === selectedActivityTypeId)?.activityType.name
                  ?? locTypes?.[0]?.activityType.name
                  ?? tc('stepper.activity');
                return (
                  <Grid size={{ xs: 12, sm: 6 }} key={loc.id}>
                    <Card
                      variant={selected ? 'elevation' : 'outlined'}
                      elevation={selected ? 3 : 0}
                      sx={{
                        borderRadius: 2, border: '2px solid',
                        borderColor: selected ? '#2d5a27' : 'divider',
                        transition: 'border-color 0.18s, box-shadow 0.18s',
                      }}
                    >
                      <CardActionArea onClick={() => onLocationSelect(loc.id)}>
                        <CardContent sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                          <Box sx={{
                            width: 36, height: 36, borderRadius: '50%', flexShrink: 0, mt: 0.25,
                            bgcolor: selected ? '#2d5a27' : 'grey.100',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {selected
                              ? <CheckCircle sx={{ fontSize: 18, color: 'white' }} />
                              : <LocationOn sx={{ fontSize: 18, color: 'text.secondary' }} />}
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                              {displayActivityName} — {loc.name}
                            </Typography>
                            {loc.description && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                                {loc.description}
                              </Typography>
                            )}
                            {loc.maxCapacity && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                {t('step1.maxCapacity', { count: loc.maxCapacity })}
                              </Typography>
                            )}
                          </Box>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}

          {/* Map view */}
          {locationSelectMode === 'map' && (
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
              {/* Sub-mode toggle */}
              {hasVirtualMap && hasRealMap && (
                <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                  <ToggleButtonGroup value={mapSubMode} exclusive onChange={(_, v) => v && onMapSubModeChange(v)} size="small">
                    <ToggleButton value="virtual">{tc('stepper.virtualMap')}</ToggleButton>
                    <ToggleButton value="real">{tc('stepper.realMap')}</ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              )}

              {/* Real map */}
              {hasRealMap && (!hasVirtualMap || mapSubMode === 'real') && (
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
                      const pinActivityName =
                        locTypes?.find((e) => e.activityTypeId === selectedActivityTypeId)?.activityType.name
                        ?? locTypes?.[0]?.activityType.name
                        ?? tc('stepper.activity');
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
                    onPinClick={(id) => onLocationSelect(id)}
                  />
                  {selectedLocationId && (
                    <Box sx={{ px: 1.5, py: 1, bgcolor: '#e8f5e9', borderTop: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="caption" sx={{ color: '#2d5a27', fontWeight: 700 }}>
                        {tc('stepper.selected')}: {availableLocations.find((l) => l.id === selectedLocationId)?.name}
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}

              {/* Virtual SVG map */}
              {hasVirtualMap && (!hasRealMap || mapSubMode === 'virtual') && (
                <Box>
                  <Box sx={{ px: 1.5, py: 1, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, mr: 0.5 }}>
                      {tc('stepper.legend')}
                    </Typography>
                    <Chip size="small" label={tc('stepper.selectable')} sx={{ bgcolor: '#1b5e20', color: 'white', fontWeight: 700, '& .MuiChip-label': { px: 1.25 } }} />
                    <Chip size="small" label={tc('stepper.selected')} sx={{ bgcolor: '#0d47a1', color: 'white', fontWeight: 700, border: '2px solid #ffeb3b', '& .MuiChip-label': { px: 1.25 } }} />
                  </Box>
                  <svg
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    style={{ width: '100%', height: 'auto', display: 'block', background: '#f0ebe3' }}
                  >
                    {(availableLocations.find((loc) => !!loc.mapImageUrl)?.mapImageUrl || selectedLocation?.mapImageUrl) && (
                      <image
                        href={availableLocations.find((loc) => !!loc.mapImageUrl)?.mapImageUrl || selectedLocation?.mapImageUrl || ''}
                        x={0} y={0}
                        width={svgWidth}
                        height={svgHeight}
                        preserveAspectRatio="xMidYMid slice"
                      />
                    )}
                    {availableLocations.map((loc) => {
                      const zone = parseLocationZone(loc.svgMapData);
                      if (!zone) return null;
                      const sel = selectedLocationId === loc.id;
                      const baseRadius = zone.r;
                      return (
                        <g key={loc.id} onClick={() => onLocationSelect(loc.id)} style={{ cursor: 'pointer' }}>
                          <circle cx={zone.cx} cy={zone.cy} r={sel ? baseRadius + 8 : baseRadius + 5} fill="rgba(0,0,0,0.18)" />
                          <circle cx={zone.cx} cy={zone.cy} r={sel ? baseRadius + 5 : baseRadius + 2} fill="none" stroke={sel ? '#ffeb3b' : 'rgba(255,255,255,0.95)'} strokeWidth={sel ? 4 : 3} />
                          <circle cx={zone.cx} cy={zone.cy} r={baseRadius} fill={sel ? '#0d47a1' : '#1b5e20'} fillOpacity={sel ? 0.95 : 0.82} stroke="white" strokeWidth={sel ? 3 : 2} />
                          {sel && (
                            <text x={zone.cx} y={zone.cy + 4} textAnchor="middle" fill="white" fontSize={14} fontWeight={900} stroke="rgba(0,0,0,0.55)" strokeWidth={2} paintOrder="stroke">✓</text>
                          )}
                          <text
                            x={zone.cx} y={zone.cy + baseRadius + 16} textAnchor="middle"
                            fill={sel ? '#0d47a1' : 'rgba(0,0,0,0.9)'} fontSize={sel ? 12 : 11} fontWeight={sel ? 900 : 700}
                            stroke="rgba(255,255,255,0.98)" strokeWidth={4} paintOrder="stroke"
                          >
                            {sel ? `${tc('stepper.selected')}: ${loc.name}` : loc.name}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </Box>
              )}

              {/* No map fallback */}
              {!hasVirtualMap && !hasRealMap && (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">{tc('stepper.noMapAvailable')}</Typography>
                </Box>
              )}
            </Box>
          )}
        </SectionBlock>

        {/* ── Section 2: Dates (unlocked after location chosen) ──────── */}
        <Collapse in={datesUnlocked} timeout={320}>
          <SectionBlock
            number={2}
            title={t('step2.heading')}
            done={!!spotsUnlocked}
            summary={datesSummary}
          >
            {selectedLocation?.instructions && (
              <Alert severity="info" icon={<MapIcon />} sx={{ mb: 2, '& .MuiAlert-message': { width: '100%' } }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  {t('locationInstructions')}
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                  {selectedLocation.instructions}
                </Typography>
              </Alert>
            )}
            <DateRangePicker
              fromValue={startDate}
              toValue={endDate}
              onFromChange={onStartDateChange}
              onToChange={onEndDateChange}
              fromError={startDateError}
              toError={endDateError}
              minFrom={today}
            />
          </SectionBlock>
        </Collapse>

        {/* ── Section 3: Spots (unlocked after valid date range, if required) ── */}
        <Collapse in={spotsUnlocked && !!selectedLocation?.requiresSpot} timeout={320}>
          <SectionBlock
            number={3}
            title={t('steps.spotSelection')}
            done={(selectedSpotIds.length > 0) && Object.entries(spotTimeslotSelections).length >= 0}
            summary={spotsSummary}
          >
            {availabilityError && <Alert severity="error" sx={{ mb: 1.5 }}>{availabilityError}</Alert>}
            {spotError && <Alert severity="warning" sx={{ mb: 1.5 }}>{spotError}</Alert>}

            {availabilityLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={18} />
                <Typography variant="body2" color="text.secondary">{tc('stepper.checkingAvailability')}</Typography>
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
                      const { t: tReg } = { t: t }; // alias
                      return (
                        <Card key={spot.id} variant="outlined" sx={{ borderRadius: 2, borderColor: checked ? '#2d5a27' : 'divider', borderWidth: checked ? 2 : 1, transition: 'border-color 0.15s' }}>
                          <CardActionArea onClick={() => onSpotToggle(spot)}>
                            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.25 }}>
                              <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                  {spot.name}{spot.code ? ` (${spot.code})` : ''}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {tc('stepper.maxPeople', { count: spot.maxPeople })}
                                </Typography>
                                {(spot.minDays != null || spot.maxDays != null) && (
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                    {spot.minDays != null && spot.maxDays != null
                                      ? tReg('spot.stayRange', { min: spot.minDays, max: spot.maxDays })
                                      : spot.minDays != null
                                        ? tReg('spot.minDays', { count: spot.minDays })
                                        : tReg('spot.maxDays', { count: spot.maxDays })}
                                  </Typography>
                                )}
                              </Box>
                              <Checkbox
                                checked={checked}
                                sx={{ color: checked ? '#2d5a27' : undefined, '&.Mui-checked': { color: '#2d5a27' } }}
                              />
                            </CardContent>
                          </CardActionArea>

                          {/* Timeslot selector */}
                          {checked && (spot.timeslots ?? []).length > 0 && (
                            <Box sx={{ px: 2, pb: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1.5, mb: 1 }}>
                                <AccessTime fontSize="small" color="action" />
                                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                  {tc('stepper.selectTimeslot')}
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {(spot.timeslots ?? []).map((ts) => {
                                  const isSelected = spotTimeslotSelections[spot.id] === ts.id;
                                  const isUnavailable = ts.isAvailable === false;
                                  return (
                                    <Chip
                                      key={ts.id}
                                      size="small"
                                      icon={ts.isWholeDay ? <WbSunny fontSize="small" /> : <AccessTime fontSize="small" />}
                                      label={ts.isWholeDay ? tc('stepper.wholeDay') : `${ts.startTime} – ${ts.endTime}`}
                                      onClick={() => !isUnavailable && onSelectTimeslot(spot.id, ts.id)}
                                      disabled={isUnavailable}
                                      sx={{
                                        cursor: isUnavailable ? 'default' : 'pointer',
                                        ...(isSelected && { bgcolor: '#2d5a27', color: 'white', '& .MuiChip-icon': { color: 'white' }, '&:hover': { bgcolor: '#1e3d1a' } }),
                                        ...(isUnavailable && { opacity: 0.45, textDecoration: 'line-through' }),
                                      }}
                                    />
                                  );
                                })}
                              </Box>
                              {!spotTimeslotSelections[spot.id] && (
                                <Typography variant="caption" color="error.main" sx={{ mt: 0.5, display: 'block' }}>
                                  {tc('stepper.timeslotRequired')}
                                </Typography>
                              )}
                            </Box>
                          )}
                        </Card>
                      );
                    })
                )}
              </Stack>
            )}
          </SectionBlock>
        </Collapse>

      </Stack>

      {/* Continue button */}
      <Button
        type="submit"
        variant="contained"
        fullWidth
        size="large"
        sx={{ mt: 3 }}
        disabled={!selectedLocation || availabilityLoading}
      >
        {t('actions.continue')}
      </Button>
    </Box>
  );
}
