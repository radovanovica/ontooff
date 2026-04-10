import { AgeGroupType, GuestCounts, PaymentBreakdownItem, PricingCalculation, PricingRule, PricingTier, PricingType, PaymentMethod } from '@/types';

type BuiltInGuestCountKey = 'adults' | 'children' | 'seniors' | 'infants' | 'families' | 'groups';

const DEFAULT_GUEST_KEY_BY_AGE_GROUP: Record<Exclude<AgeGroupType, AgeGroupType.CUSTOM>, BuiltInGuestCountKey> = {
  [AgeGroupType.ADULT]: 'adults',
  [AgeGroupType.CHILD]: 'children',
  [AgeGroupType.SENIOR]: 'seniors',
  [AgeGroupType.INFANT]: 'infants',
  [AgeGroupType.FAMILY]: 'families',
  [AgeGroupType.GROUP]: 'groups',
};

export function getPricingTierGuestKey(tier: Pick<PricingTier, 'ageGroup' | 'id'>, fallbackIndex = 0): string {
  if (String(tier.ageGroup) === AgeGroupType.CUSTOM) {
    return tier.id ? `custom:${tier.id}` : `custom:${fallbackIndex}`;
  }
  return DEFAULT_GUEST_KEY_BY_AGE_GROUP[tier.ageGroup as Exclude<AgeGroupType, AgeGroupType.CUSTOM>];
}

function getTierCount(
  tier: Pick<PricingTier, 'id' | 'ageGroup'>,
  guestCounts: GuestCounts,
  index: number
): number {
  const key = getPricingTierGuestKey(tier, index);
  const value = guestCounts[key];
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
}

/**
 * Calculate total price for a registration based on pricing rule and guest counts
 */
export function calculatePricing(
  pricingRule: Pick<PricingRule, 'pricingType' | 'currency' | 'requiresPayment' | 'paymentMethod'> & {
    pricingTiers: Array<Pick<PricingTier, 'id' | 'ageGroup' | 'label' | 'pricePerUnit'>>;
  },
  guestCounts: GuestCounts,
  numberOfDays: number
): PricingCalculation {
  const breakdown: PaymentBreakdownItem[] = [];
  let totalAmount = 0;

  const tiers = pricingRule.pricingTiers;

  switch (pricingRule.pricingType) {
    case PricingType.PER_ACTIVITY: {
      // Flat fee regardless of people/days
      const tier = tiers[0];
      if (tier) {
        const price = Number(tier.pricePerUnit);
        breakdown.push({
          label: 'Activity fee',
          ageGroup: tier.ageGroup,
          quantity: 1,
          unitPrice: price,
          totalPrice: price,
        });
        totalAmount += price;
      }
      break;
    }

    case PricingType.PER_DAY: {
      // Flat fee per day
      const tier = tiers[0];
      if (tier) {
        const price = Number(tier.pricePerUnit);
        const total = price * numberOfDays;
        breakdown.push({
          label: 'Daily fee',
          ageGroup: tier.ageGroup,
          quantity: numberOfDays,
          unitPrice: price,
          totalPrice: total,
        });
        totalAmount += total;
      }
      break;
    }

    case PricingType.PER_PERSON: {
      // Per person flat fee
      for (const [index, tier] of tiers.entries()) {
        const count = getTierCount(tier, guestCounts, index);
        if (count <= 0) continue;
        const unitPrice = Number(tier.pricePerUnit);
        const total = unitPrice * count;
        breakdown.push({
          label: `${tier.label} × ${count}`,
          ageGroup: tier.ageGroup,
          quantity: count,
          unitPrice,
          totalPrice: total,
        });
        totalAmount += total;
      }
      break;
    }

    case PricingType.PER_PERSON_PER_DAY: {
      // Per person per day
      for (const [index, tier] of tiers.entries()) {
        const count = getTierCount(tier, guestCounts, index);
        if (count <= 0) continue;
        const unitPrice = Number(tier.pricePerUnit);
        const total = unitPrice * count * numberOfDays;
        breakdown.push({
          label: `${tier.label} (per day)`,
          ageGroup: tier.ageGroup,
          quantity: count * numberOfDays,
          unitPrice,
          totalPrice: total,
        });
        totalAmount += total;
      }
      break;
    }
  }

  return {
    breakdown,
    totalAmount,
    currency: pricingRule.currency,
    requiresPayment: pricingRule.requiresPayment,
    paymentMethod: pricingRule.paymentMethod,
  };
}

/**
 * Get human-readable label for payment method
 */
export function paymentMethodLabel(method: PaymentMethod): string {
  const labels: Record<PaymentMethod, string> = {
    [PaymentMethod.CASH]: 'Cash only',
    [PaymentMethod.CARD]: 'Card only',
    [PaymentMethod.BOTH]: 'Cash or Card',
  };
  return labels[method] ?? method;
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number, currency = 'RSD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Get total guest count from GuestCounts object
 */
export function getTotalGuests(guestCounts: GuestCounts): number {
  return Object.values(guestCounts).reduce<number>((sum, val) => sum + (val ?? 0), 0);
}

/**
 * Format guest counts as readable summary
 */
export function formatGuestSummary(guestCounts: GuestCounts): string {
  const parts: string[] = [];
  const labels: Record<string, string> = {
    adults: 'adult',
    children: 'child',
    seniors: 'senior',
    infants: 'infant',
    families: 'family',
    groups: 'group',
  };
  for (const [key, count] of Object.entries(guestCounts)) {
    if (!count || count <= 0) continue;
    const label = labels[key] ?? key;
    parts.push(`${count} ${label}${count > 1 ? (key === 'families' ? 'ies' : 's') : ''}`);
  }
  return parts.join(', ') || '1 person';
}
