import { calculatePricing, formatCurrency, getTotalGuests, formatGuestSummary } from '@/lib/pricing';
import { PricingType, PaymentMethod, AgeGroupType } from '@/types';

const mockPricingRule = {
  id: 'rule-1',
  name: 'Standard',
  pricingType: PricingType.PER_PERSON,
  paymentMethod: PaymentMethod.CASH,
  requiresPayment: true,
  currency: 'RSD',
  isActive: true,
  placeId: null,
  activityTypeId: null,
  activityLocationId: null,
  description: null,
  validFrom: null,
  validTo: null,
  minDays: null,
  maxDays: null,
  minPeople: null,
  maxPeople: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  pricingTiers: [
    {
      id: 'tier-1',
      pricingRuleId: 'rule-1',
      ageGroup: AgeGroupType.ADULT,
      label: 'Adult',
      minAge: 18,
      maxAge: null,
      pricePerUnit: 20,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'tier-2',
      pricingRuleId: 'rule-1',
      ageGroup: AgeGroupType.CHILD,
      label: 'Child',
      minAge: 3,
      maxAge: 17,
      pricePerUnit: 10,
      sortOrder: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
};

describe('calculatePricing', () => {
  it('calculates PER_PERSON pricing correctly', () => {
    const result = calculatePricing(mockPricingRule, { adults: 2, children: 1 }, 1);
    expect(result.totalAmount).toBe(50); // 2*20 + 1*10
    expect(result.breakdown).toHaveLength(2);
    expect(result.currency).toBe('RSD');
    expect(result.requiresPayment).toBe(true);
  });

  it('calculates PER_PERSON_PER_DAY pricing correctly', () => {
    const rule = { ...mockPricingRule, pricingType: PricingType.PER_PERSON_PER_DAY };
    const result = calculatePricing(rule, { adults: 2, children: 1 }, 3);
    expect(result.totalAmount).toBe(150); // (2*20 + 1*10) * 3
  });

  it('calculates PER_DAY pricing correctly', () => {
    const rule = {
      ...mockPricingRule,
      pricingType: PricingType.PER_DAY,
      pricingTiers: [
        {
          ...mockPricingRule.pricingTiers[0],
          pricePerUnit: 100,
          ageGroup: AgeGroupType.GROUP,
        },
      ],
    };
    const result = calculatePricing(rule, {}, 4);
    expect(result.totalAmount).toBe(400); // 100 * 4 days
  });

  it('returns zero for empty guest counts and PER_PERSON', () => {
    const result = calculatePricing(mockPricingRule, {}, 1);
    expect(result.totalAmount).toBe(0);
  });
});

describe('formatCurrency', () => {
  it('formats RSD correctly', () => {
    expect(formatCurrency(1234.5, 'RSD')).toContain('1');
  });
});

describe('getTotalGuests', () => {
  it('sums all guest counts', () => {
    expect(getTotalGuests({ adults: 2, children: 3, infants: 1 })).toBe(6);
  });

  it('handles empty guest counts', () => {
    expect(getTotalGuests({})).toBe(0);
  });

  it('ignores undefined values', () => {
    expect(getTotalGuests({ adults: 2, children: undefined })).toBe(2);
  });
});

describe('formatGuestSummary', () => {
  it('returns summary string for multiple groups', () => {
    const summary = formatGuestSummary({ adults: 2, children: 1 });
    expect(summary).toContain('2');
    expect(summary).toContain('1');
  });

  it('handles empty guest counts', () => {
    const summary = formatGuestSummary({});
    expect(summary).toBe('');
  });
});
