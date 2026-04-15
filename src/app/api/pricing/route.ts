import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { UserRole, AgeGroupType, PaymentMethod, PricingType } from '@/types';

const tierSchema = z.object({
  ageGroup: z.nativeEnum(AgeGroupType),
  label: z.string().min(1),
  minAge: z.number().int().nonnegative().optional(),
  maxAge: z.number().int().positive().optional(),
  pricePerUnit: z.number().nonnegative(),
  sortOrder: z.number().default(0),
}).refine(
  (tier) => tier.minAge == null || tier.maxAge == null || tier.maxAge >= tier.minAge,
  { message: 'Tier maxAge must be greater than or equal to minAge', path: ['maxAge'] }
);

const schema = z.object({
  activityTypeId: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  pricingType: z.nativeEnum(PricingType),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.BOTH),
  requiresPayment: z.boolean().default(true),
  currency: z.string().default('RSD'),
  minDays: z.number().int().positive().optional(),
  maxDays: z.number().int().positive().optional(),
  minPeople: z.number().int().positive().optional(),
  maxPeople: z.number().int().positive().optional(),
  pricingTiers: z.array(tierSchema).min(1, 'At least one pricing tier is required'),
}).superRefine((data, ctx) => {
  if (data.minDays != null && data.maxDays != null && data.maxDays < data.minDays) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['maxDays'], message: 'maxDays must be >= minDays' });
  }
  if (data.minPeople != null && data.maxPeople != null && data.maxPeople < data.minPeople) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['maxPeople'], message: 'maxPeople must be >= minPeople' });
  }

  const nonCustomAgeGroups = data.pricingTiers
    .filter((tier) => tier.ageGroup !== AgeGroupType.CUSTOM)
    .map((tier) => tier.ageGroup);

  if (new Set(nonCustomAgeGroups).size !== nonCustomAgeGroups.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['pricingTiers'],
      message: 'Each non-custom age group can only appear once per pricing rule',
    });
  }
});

async function canManagePricing(
  activityTypeId: string,
  userId: string,
  role: UserRole
): Promise<boolean> {
  if (role === UserRole.SUPER_ADMIN) return true;
  const type = await prisma.activityType.findUnique({
    where: { id: activityTypeId },
    include: { place: { select: { ownerId: true } } },
  });
  return type?.place.ownerId === userId;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const activityLocationId = searchParams.get('activityLocationId');
  const activityTypeId = searchParams.get('activityTypeId');

  const where: Record<string, unknown> = { isActive: true };

  if (activityTypeId) {
    where.activityTypeId = activityTypeId;
  } else if (activityLocationId) {
    const location = await prisma.activityLocation.findUnique({
      where: { id: activityLocationId },
      select: { activityTypes: { select: { activityTypeId: true } } },
    });
    const typeIds = location?.activityTypes.map((a: { activityTypeId: string }) => a.activityTypeId) ?? [];
    if (typeIds.length > 0) {
      where.activityTypeId = { in: typeIds };
    }
  }

  const rules = await prisma.pricingRule.findMany({
    where,
    include: { pricingTiers: { orderBy: { sortOrder: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ success: true, data: rules });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const result = schema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ success: false, error: 'Validation failed', details: result.error.flatten().fieldErrors }, { status: 422 });
  }

  const { pricingTiers, ...ruleData } = result.data;

  if (!(await canManagePricing(ruleData.activityTypeId, session.user.id, session.user.role))) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const rule = await prisma.pricingRule.create({
    data: {
      ...ruleData,
      activityLocationId: null,
      pricingTiers: { create: pricingTiers },
    },
    include: { pricingTiers: true },
  });

  return NextResponse.json({ success: true, data: rule }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id } = z.object({ id: z.string() }).parse(body);

  const rule = await prisma.pricingRule.findUnique({
    where: { id },
    include: { activityType: { include: { place: { select: { ownerId: true } } } } },
  });
  if (!rule) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  if (!rule.activityTypeId) {
    return NextResponse.json({ success: false, error: 'Invalid pricing rule scope' }, { status: 422 });
  }

  if (!(await canManagePricing(rule.activityTypeId, session.user.id, session.user.role))) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  await prisma.pricingRule.delete({ where: { id } });
  return NextResponse.json({ success: true, message: 'Pricing rule deleted' });
}
