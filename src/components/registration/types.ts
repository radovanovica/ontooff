import type { ActivityLocation, PricingRule, Timeslot, PaymentMethod } from '@/types';
import type { SpotMapItem } from '@/components/map/SpotMap';

export type LocationWithDetails = ActivityLocation & {
  place?: { name: string; id: string; slug: string; logoUrl?: string | null };
  spots?: SpotMapItem[];
  pricingRules?: PricingRule[];
};

export type AvailableSpot = SpotMapItem & {
  isAvailable?: boolean;
  minDays?: number | null;
  maxDays?: number | null;
  timeslots?: (Timeslot & { isAvailable?: boolean })[];
};

export interface Step1Values {
  startDate: string;
  endDate: string;
  spotIds: string[];
}

export interface Step2Values {
  guestCounts: Record<string, number>;
  pricingRuleId?: string;
  paymentMethod?: PaymentMethod;
  notes?: string;
}

export interface Step3Values {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
}
