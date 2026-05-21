import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { Box, Container, Paper, Typography } from '@mui/material';
import { validateEmbedToken } from '@/lib/utils';
import { prisma } from '@/lib/prisma';
import RegistrationStepper from '@/components/registration/RegistrationStepper';
import EmbedHeader from '@/components/embed/EmbedHeader';
import type { Metadata } from 'next';
import { SpotStatus } from '@prisma/client';

interface Props {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const embedToken = await validateEmbedToken(token);
  if (!embedToken) return { title: 'Not Found' };
  const place = await prisma.place.findUnique({ where: { id: embedToken.placeId }, select: { name: true } });
  return { title: `Book — ${place?.name ?? 'ontooff'}` };
}

export default async function EmbedPage({ params }: Props) {
  const { token } = await params;
  const embedToken = await validateEmbedToken(token);
  if (!embedToken) notFound();

  // Check allowed origins against Referer header
  const reqHeaders = await headers();
  const referer = reqHeaders.get('referer') ?? '';
  if (embedToken.allowedOrigins.length > 0 && referer) {
    let refHost = '';
    try { refHost = new URL(referer).hostname; } catch { /* invalid referer */ }
    const allowed = embedToken.allowedOrigins.some((o) => {
      const clean = o.trim().replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
      return clean && (refHost === clean || refHost.endsWith(`.${clean}`));
    });
    if (!allowed) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', p: 4 }}>
          <Typography color="text.secondary">This embed is not authorized for this domain.</Typography>
        </Box>
      );
    }
  }

  // Fetch place info for header (logo + name)
  const place = await prisma.place.findUnique({
    where: { id: embedToken.placeId },
    select: { name: true, logoUrl: true },
  });

  // Fetch location(s): specific token => one location, place token => all active locations
  const includeConfig = {
    activityTypes: { include: { activityType: true } },
    place: { select: { id: true, name: true } },
    spots: { where: { status: SpotStatus.AVAILABLE }, orderBy: { sortOrder: 'asc' as const } },
  };

  const locationId = embedToken.activityLocationId;
  const locations = locationId
    ? await prisma.activityLocation.findMany({
        where: { id: locationId, isActive: true },
        include: includeConfig,
      })
    : await prisma.activityLocation.findMany({
        where: { placeId: embedToken.placeId, isActive: true },
        include: includeConfig,
        orderBy: { sortOrder: 'asc' },
      });

  const location = locations[0] ?? null;

  if (!location) notFound();

  const activityTypeIds = [...new Set(locations.flatMap((loc) => loc.activityTypes.map((a) => a.activityTypeId)))];
  const rules = await prisma.pricingRule.findMany({
    where: { isActive: true, activityTypeId: { in: activityTypeIds } },
    include: { pricingTiers: true },
    orderBy: { createdAt: 'desc' },
  });

  const rulesByType = new Map<string, typeof rules>();
  for (const rule of rules) {
    if (!rule.activityTypeId) continue;
    const existing = rulesByType.get(rule.activityTypeId) ?? [];
    existing.push(rule);
    rulesByType.set(rule.activityTypeId, existing);
  }

  // Serialize Decimal fields so they can cross the server→client boundary
  const serializedLocation = {
    ...location,
    pricingRules: location.activityTypes.flatMap((a) => (rulesByType.get(a.activityTypeId) ?? []).map((rule) => ({
      ...rule,
      pricingTiers: (rule.pricingTiers ?? []).map((tier) => ({
        ...tier,
        pricePerUnit: Number(tier.pricePerUnit),
      })),
    }))),
  };

  const serializedLocations = locations.map((loc) => ({
    ...loc,
    pricingRules: loc.activityTypes.flatMap((a) => (rulesByType.get(a.activityTypeId) ?? []).map((rule) => ({
      ...rule,
      pricingTiers: (rule.pricingTiers ?? []).map((tier) => ({
        ...tier,
        pricePerUnit: Number(tier.pricePerUnit),
      })),
    }))),
  }));

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        py: { xs: 3, md: 5 },
        px: 2,
      }}
    >
      <Container maxWidth="md">
        <EmbedHeader placeName={place?.name ?? null} logoUrl={place?.logoUrl ?? null} />
        <Paper elevation={3} sx={{ p: { xs: 3, md: 5 }, borderRadius: 3 }}>
          <RegistrationStepper
            location={serializedLocation as unknown as Parameters<typeof RegistrationStepper>[0]['location']}
            locations={serializedLocations as unknown as Parameters<typeof RegistrationStepper>[0]['locations']}
            embedTokenId={embedToken.id}
            initialActivityTypeId={embedToken.activityTypeId ?? null}
            lockActivityType={!!embedToken.activityTypeId}
          />
        </Paper>
      </Container>
    </Box>
  );
}
