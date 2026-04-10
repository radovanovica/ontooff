import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculatePricing } from '@/lib/pricing';
import type { GuestCounts } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pricingRuleId, guestCounts, numberOfDays } = body as {
      pricingRuleId: string;
      guestCounts: GuestCounts;
      numberOfDays: number;
    };

    if (!pricingRuleId || !guestCounts) {
      return NextResponse.json(
        { error: 'pricingRuleId and guestCounts are required' },
        { status: 400 }
      );
    }

    const pricingRule = await prisma.pricingRule.findUnique({
      where: { id: pricingRuleId },
      include: { pricingTiers: { orderBy: { sortOrder: 'asc' } } },
    });

    if (!pricingRule) {
      return NextResponse.json({ error: 'Pricing rule not found' }, { status: 404 });
    }

    // Normalize Decimal → number to avoid Prisma Decimal arithmetic issues
    const normalizedRule = {
      ...pricingRule,
      pricingTiers: pricingRule.pricingTiers.map((t) => ({
        ...t,
        pricePerUnit: Number(t.pricePerUnit),
      })),
    };

    const days = typeof numberOfDays === 'number' && numberOfDays > 0 ? numberOfDays : 1;

    const totalGuests = Object.values(guestCounts ?? {}).reduce<number>((sum, count) => {
      const value = typeof count === 'number' && Number.isFinite(count) ? count : 0;
      return sum + Math.max(0, value);
    }, 0);

    if (pricingRule.minDays != null && days < pricingRule.minDays) {
      return NextResponse.json({ error: `Minimum stay is ${pricingRule.minDays} day(s)` }, { status: 422 });
    }

    if (pricingRule.maxDays != null && days > pricingRule.maxDays) {
      return NextResponse.json({ error: `Maximum stay is ${pricingRule.maxDays} day(s)` }, { status: 422 });
    }

    if (pricingRule.minPeople != null && totalGuests < pricingRule.minPeople) {
      return NextResponse.json({ error: `Minimum guests is ${pricingRule.minPeople}` }, { status: 422 });
    }

    if (pricingRule.maxPeople != null && totalGuests > pricingRule.maxPeople) {
      return NextResponse.json({ error: `Maximum guests is ${pricingRule.maxPeople}` }, { status: 422 });
    }

    const calculation = calculatePricing(normalizedRule, guestCounts, days);

    return NextResponse.json(calculation);
  } catch (error) {
    console.error('Error calculating pricing:', error);
    return NextResponse.json({ error: 'Failed to calculate pricing' }, { status: 500 });
  }
}
