// eslint-disable-next-line @typescript-eslint/no-require-imports
import { PrismaClient, UserRole, PricingType, PaymentMethod, SpotStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { ACTIVITY_TAGS } from '../src/config/activity-tags';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱  Starting seed…');

  // ──────────────────────────────────────
  // 1. Super Admin
  // ──────────────────────────────────────
  const adminPassword = await bcrypt.hash('Admin123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ontooff.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'admin@ontooff.com',
      password: adminPassword,
      emailVerified: new Date(),
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
  });
  console.log('✅  Super admin:', admin.email);

  // ──────────────────────────────────────
  // 2. Place Owner
  // ──────────────────────────────────────
  const ownerPassword = await bcrypt.hash('Owner123!', 12);
  const owner = await prisma.user.upsert({
    where: { email: 'owner@greenvalley.com' },
    update: {},
    create: {
      name: 'Marko Petrovic',
      email: 'owner@greenvalley.com',
      password: ownerPassword,
      emailVerified: new Date(),
      role: UserRole.PLACE_OWNER,
      isActive: true,
    },
  });
  console.log('✅  Place owner:', owner.email);

  // ──────────────────────────────────────
  // 3. Place
  // ──────────────────────────────────────
  const place = await prisma.place.upsert({
    where: { slug: 'green-valley-resort' },
    update: {},
    create: {
      name: 'Green Valley Resort',
      slug: 'green-valley-resort',
      description:
        'A beautiful nature resort nestled in the valley, offering camping, fishing, and kayaking.',
      address: 'Sumska 12',
      city: 'Zlatibor',
      country: 'Serbia',
      phone: '+381 61 123 4567',
      email: 'info@greenvalley.com',
      website: 'https://greenvalley.com',
      timezone: 'Europe/Belgrade',
      isActive: true,
      ownerId: owner.id,
    },
  });
  console.log('✅  Place:', place.name);

  // ──────────────────────────────────────
  // 4. Activity Types (scoped to place)
  // ──────────────────────────────────────
  const existingTypes = await prisma.activityType.findMany({ where: { placeId: place.id } });

  const getOrCreate = async (name: string, icon: string, color: string, description: string) => {
    const found = existingTypes.find((t) => t.name === name);
    if (found) return found;
    return prisma.activityType.create({
      data: { placeId: place.id, name, icon, color, description },
    });
  };

  const campingType = await getOrCreate('Camping', '⛺', '#2d5a27', 'Overnight camping');
  const fishingType = await getOrCreate('Fishing', '🎣', '#1565c0', 'Freshwater fishing');
  await getOrCreate('Kayaking', '🛶', '#0277bd', 'River kayaking');
  await getOrCreate('Hiking', '🥾', '#5d4037', 'Trail hiking');
  console.log('✅  Activity types ready');

  // ──────────────────────────────────────
  // 5. Activity Locations
  // ──────────────────────────────────────
  let campingLocation = await prisma.activityLocation.findFirst({
    where: { placeId: place.id, name: 'Main Campground' },
  });
  if (!campingLocation) {
    campingLocation = await prisma.activityLocation.create({
      data: {
        placeId: place.id,
        activityTypeId: campingType.id,
        name: 'Main Campground',
        description: 'Our main campground with 12 marked spots along the forest edge.',
        maxCapacity: 12,
        requiresSpot: true,
        isActive: true,
        mapWidth: 800,
        mapHeight: 500,
      },
    });
  }

  let fishingLocation = await prisma.activityLocation.findFirst({
    where: { placeId: place.id, name: 'River Fishing Area' },
  });
  if (!fishingLocation) {
    fishingLocation = await prisma.activityLocation.create({
      data: {
        placeId: place.id,
        activityTypeId: fishingType.id,
        name: 'River Fishing Area',
        description: 'Designated fishing spots along the Zlatibor river.',
        maxCapacity: 8,
        requiresSpot: true,
        isActive: true,
        mapWidth: 600,
        mapHeight: 400,
      },
    });
  }
  console.log('✅  Locations ready');

  // ──────────────────────────────────────
  // 6. Spots
  // ──────────────────────────────────────
  const campingSpotCount = await prisma.spot.count({ where: { activityLocationId: campingLocation.id } });
  if (campingSpotCount === 0) {
    const campingSpots = Array.from({ length: 12 }, (_, i) => ({
      name: `Spot ${String.fromCharCode(65 + Math.floor(i / 4))}${(i % 4) + 1}`,
      code: `${String.fromCharCode(65 + Math.floor(i / 4))}${(i % 4) + 1}`,
      maxPeople: 6,
      status: SpotStatus.AVAILABLE,
      activityLocationId: campingLocation!.id,
    }));
    await prisma.spot.createMany({ data: campingSpots });
    console.log('✅  12 camping spots created');
  } else {
    console.log('⏭   Camping spots already exist');
  }

  const fishingSpotCount = await prisma.spot.count({ where: { activityLocationId: fishingLocation.id } });
  if (fishingSpotCount === 0) {
    const fishingSpots = Array.from({ length: 8 }, (_, i) => ({
      name: `Fishing Spot F${i + 1}`,
      code: `F${i + 1}`,
      maxPeople: 2,
      status: SpotStatus.AVAILABLE,
      activityLocationId: fishingLocation!.id,
    }));
    await prisma.spot.createMany({ data: fishingSpots });
    console.log('✅  8 fishing spots created');
  } else {
    console.log('⏭   Fishing spots already exist');
  }

  // ──────────────────────────────────────
  // 7. Pricing Rules
  // ──────────────────────────────────────
  let campingPricing = await prisma.pricingRule.findFirst({
    where: { activityLocationId: campingLocation.id, name: 'Standard Camping' },
  });
  if (!campingPricing) {
    campingPricing = await prisma.pricingRule.create({
      data: {
        activityLocationId: campingLocation.id,
        name: 'Standard Camping',
        pricingType: PricingType.PER_PERSON_PER_DAY,
        paymentMethod: PaymentMethod.BOTH,
        requiresPayment: true,
        currency: 'EUR',
        isActive: true,
        pricingTiers: {
          create: [
            { ageGroup: 'ADULT', label: 'Adult (18+)', minAge: 18, pricePerUnit: 15.0 },
            { ageGroup: 'CHILD', label: 'Child (3-17)', minAge: 3, maxAge: 17, pricePerUnit: 8.0 },
            { ageGroup: 'INFANT', label: 'Infant (0-2)', minAge: 0, maxAge: 2, pricePerUnit: 0.0 },
          ],
        },
      },
    });
    console.log('✅  Camping pricing rule created');
  } else {
    console.log('⏭   Camping pricing rule already exists');
  }

  const fishingPricingExists = await prisma.pricingRule.findFirst({
    where: { activityLocationId: fishingLocation.id, name: 'Day Fishing' },
  });
  if (!fishingPricingExists) {
    await prisma.pricingRule.create({
      data: {
        activityLocationId: fishingLocation.id,
        name: 'Day Fishing',
        pricingType: PricingType.PER_PERSON,
        paymentMethod: PaymentMethod.CASH,
        requiresPayment: true,
        currency: 'EUR',
        isActive: true,
        pricingTiers: {
          create: [
            { ageGroup: 'ADULT', label: 'Adult', pricePerUnit: 10.0 },
            { ageGroup: 'CHILD', label: 'Child (under 14)', maxAge: 14, pricePerUnit: 5.0 },
          ],
        },
      },
    });
    console.log('✅  Fishing pricing rule created');
  } else {
    console.log('⏭   Fishing pricing rule already exists');
  }

  // ──────────────────────────────────────
  // 8. Embed Token
  // ──────────────────────────────────────
  const existingToken = await prisma.embedToken.findFirst({ where: { placeId: place.id } });
  if (!existingToken) {
    const tokenValue = crypto.randomBytes(32).toString('hex');
    await prisma.embedToken.create({
      data: {
        token: tokenValue,
        label: 'Website Booking Widget',
        placeId: place.id,
        activityLocationId: campingLocation.id,
        allowedOrigins: ['localhost:3000', 'greenvalley.com'],
        isActive: true,
      },
    });
    console.log('✅  Embed token created');
  } else {
    console.log('⏭   Embed token already exists:', existingToken.token.substring(0, 16) + '…');
  }

  // ──────────────────────────────────────
  // 9. Sample Registration
  // ──────────────────────────────────────
  const existingReg = await prisma.registration.findFirst({
    where: { email: 'john.doe@example.com', activityLocationId: campingLocation.id },
  });
  if (!existingReg) {
    const regNumber = `GV-${Date.now().toString().slice(-6)}`;
    await prisma.registration.create({
      data: {
        registrationNumber: regNumber,
        activityLocationId: campingLocation.id,
        pricingRuleId: campingPricing.id,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+381601234567',
        address: 'Knez Mihailova 1, Beograd',
        startDate: new Date('2025-07-15'),
        endDate: new Date('2025-07-18'),
        numberOfDays: 3,
        guestCounts: { ADULT: 2, CHILD: 1 },
        totalAmount: 114.0,
        status: 'CONFIRMED',
        paymentStatus: 'UNPAID',
        paymentMethod: 'BOTH',
        editToken: crypto.randomBytes(32).toString('hex'),
        editTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    console.log('✅  Sample registration created');
  } else {
    console.log('⏭   Sample registration already exists');
  }

  // ──────────────────────────────────────
  // 10. Activity Tags  (from src/config/activity-tags.ts)
  // ──────────────────────────────────────
  for (const tag of ACTIVITY_TAGS) {
    await prisma.activityTag.upsert({
      where: { slug: tag.slug },
      update: { name: tag.name, icon: tag.icon, color: tag.color, sortOrder: tag.sortOrder },
      create: { ...tag, isActive: true },
    });
  }
  console.log(`✅  Activity tags seeded (${ACTIVITY_TAGS.length} tags)`);

  console.log('\n🎉  Seed complete!');
  console.log('\nLogin credentials:');
  console.log('  Admin →  admin@ontooff.com  /  Admin123!');
  console.log('  Owner →  owner@greenvalley.com      /  Owner123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
