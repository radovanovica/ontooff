import { notFound } from 'next/navigation';
import { Box, Container, Typography, Paper } from '@mui/material';
import { validateEmbedToken } from '@/lib/utils';
import { prisma } from '@/lib/prisma';
import RegistrationStepper from '@/components/registration/RegistrationStepper';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const embedToken = await validateEmbedToken(token);
  if (!embedToken) return { title: 'Not Found' };
  const place = await prisma.place.findUnique({ where: { id: embedToken.placeId }, select: { name: true } });
  return { title: `Book — ${place?.name ?? 'ActivityTracker'}` };
}

export default async function EmbedPage({ params }: Props) {
  const { token } = await params;
  const embedToken = await validateEmbedToken(token);
  if (!embedToken) notFound();

  // Fetch location(s): specific token => one location, place token => all active locations
  const includeConfig = {
    activityType: true,
    place: { select: { id: true, name: true } },
    spots: { where: { status: 'AVAILABLE' }, orderBy: { sortOrder: 'asc' as const } },
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

  const activityTypeIds = [...new Set(locations.map((loc) => loc.activityTypeId))];
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
    pricingRules: (rulesByType.get(location.activityTypeId) ?? []).map((rule) => ({
      ...rule,
      pricingTiers: (rule.pricingTiers ?? []).map((tier) => ({
        ...tier,
        pricePerUnit: Number(tier.pricePerUnit),
      })),
    })),
  };

  const serializedLocations = locations.map((loc) => ({
    ...loc,
    pricingRules: (rulesByType.get(loc.activityTypeId) ?? []).map((rule) => ({
      ...rule,
      pricingTiers: (rule.pricingTiers ?? []).map((tier) => ({
        ...tier,
        pricePerUnit: Number(tier.pricePerUnit),
      })),
    })),
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
        <Paper elevation={3} sx={{ p: { xs: 3, md: 5 }, borderRadius: 3 }}>
          <RegistrationStepper
            location={serializedLocation as Parameters<typeof RegistrationStepper>[0]['location']}
            locations={serializedLocations as Parameters<typeof RegistrationStepper>[0]['locations']}
            embedTokenId={embedToken.id}
          />
        </Paper>
      </Container>
    </Box>
  );
}
