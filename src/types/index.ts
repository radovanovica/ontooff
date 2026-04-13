// ─────────────────────────────────────────
// ENUMS (mirror Prisma enums for client use)
// ─────────────────────────────────────────

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  PLACE_OWNER = 'PLACE_OWNER',
  USER = 'USER',
}

export enum RegistrationStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW',
}

export enum SpotStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  MAINTENANCE = 'MAINTENANCE',
  DISABLED = 'DISABLED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  BOTH = 'BOTH',
}

export enum PricingType {
  PER_ACTIVITY = 'PER_ACTIVITY',
  PER_PERSON = 'PER_PERSON',
  PER_PERSON_PER_DAY = 'PER_PERSON_PER_DAY',
  PER_DAY = 'PER_DAY',
}

export enum AgeGroupType {
  ADULT = 'ADULT',
  CHILD = 'CHILD',
  SENIOR = 'SENIOR',
  INFANT = 'INFANT',
  FAMILY = 'FAMILY',
  GROUP = 'GROUP',
  CUSTOM = 'CUSTOM',
}

export enum PaymentStatus {
  UNPAID = 'UNPAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  REFUNDED = 'REFUNDED',
  WAIVED = 'WAIVED',
}

export enum OrgStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED',
}

// ─────────────────────────────────────────
// USER
// ─────────────────────────────────────────

export interface User {
  id: string;
  name: string | null;
  email: string;
  emailVerified: Date | null;
  image: string | null;
  role: UserRole;
  isActive: boolean;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSession {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: UserRole;
}

// ─────────────────────────────────────────
// ORGANIZATION
// ─────────────────────────────────────────

export interface Organization {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  website: string | null;
  description: string | null;
  status: OrgStatus;
  approvedAt: Date | null;
  approvedBy: string | null;
  ownerId: string | null;
  createdAt: Date;
  updatedAt: Date;
  places?: Place[];
}

// ─────────────────────────────────────────
// ACTIVITY TAG
// ─────────────────────────────────────────

export interface ActivityTag {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  isActive: boolean;
  sortOrder: number;
}

// ─────────────────────────────────────────
// FREE / COMMUNITY LOCATION
// ─────────────────────────────────────────

export interface FreeLocation {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  gallery: string | null;
  coverImageIndex: number | null;
  instructions: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  tags?: { tag: ActivityTag }[];
}

// ─────────────────────────────────────────
// PLACE
// ─────────────────────────────────────────

export interface Place {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  ownerId: string;
  organizationId: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  isActive: boolean;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
  owner?: User;
  organization?: Organization;
  activityTypes?: ActivityType[];
  activityLocations?: ActivityLocation[];
}

export interface PlaceWithStats extends Place {
  _count?: {
    activityLocations: number;
    embedTokens: number;
  };
  totalRegistrations?: number;
}

// ─────────────────────────────────────────
// ACTIVITY TYPE
// ─────────────────────────────────────────

export interface ActivityType {
  id: string;
  placeId: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  place?: Place;
  activityLocations?: ActivityLocation[];
  tags?: ActivityTag[];
}

// ─────────────────────────────────────────
// ACTIVITY LOCATION
// ─────────────────────────────────────────

export interface SvgMapSpotShape {
  id: string;
  type: 'rect' | 'circle' | 'polygon' | 'path';
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rx?: number;
  cx?: number;
  cy?: number;
  r?: number;
  points?: string;
  d?: string;
  label?: string;
}

export interface ActivityLocation {
  id: string;
  placeId: string;
  activityTypeId: string;
  name: string;
  description: string | null;
  svgMapData: string | null;
  mapImageUrl: string | null;
  mapWidth: number | null;
  mapHeight: number | null;
  maxCapacity: number | null;
  requiresSpot: boolean;
  isActive: boolean;
  sortOrder: number;
  gallery: string | null;           // JSON: string[] of base64 data-URIs
  coverImageIndex: number | null;   // index of the primary/cover gallery image
  instructions: string | null;      // How to find the location
  latitude: number | null;
  longitude: number | null;
  createdAt: Date;
  updatedAt: Date;
  place?: Place;
  activityType?: ActivityType;
  spots?: Spot[];
}

// ─────────────────────────────────────────
// SPOT
// ─────────────────────────────────────────

export interface Spot {
  id: string;
  activityLocationId: string;
  name: string;
  description: string | null;
  code: string | null;
  svgShapeData: string | null;
  maxPeople: number;
  amenities: string[];
  imageUrl: string | null;
  status: SpotStatus;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  activityLocation?: ActivityLocation;
  // Computed availability
  isAvailable?: boolean;
  bookedDates?: string[];
}

export interface SpotAvailability {
  spotId: string;
  date: string;
  isAvailable: boolean;
  registrationId?: string;
}

// ─────────────────────────────────────────
// PRICING
// ─────────────────────────────────────────

export interface PricingRule {
  id: string;
  placeId: string | null;
  activityTypeId: string | null;
  activityLocationId: string | null;
  name: string;
  description: string | null;
  pricingType: PricingType;
  paymentMethod: PaymentMethod;
  requiresPayment: boolean;
  currency: string;
  isActive: boolean;
  validFrom: Date | null;
  validTo: Date | null;
  minDays: number | null;
  maxDays: number | null;
  minPeople: number | null;
  maxPeople: number | null;
  createdAt: Date;
  updatedAt: Date;
  pricingTiers?: PricingTier[];
}

export interface PricingTier {
  id: string;
  pricingRuleId: string;
  ageGroup: AgeGroupType;
  label: string;
  minAge: number | null;
  maxAge: number | null;
  pricePerUnit: number;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────────────────
// GUEST COUNTS
// ─────────────────────────────────────────

export interface GuestCounts {
  adults?: number;
  children?: number;
  seniors?: number;
  infants?: number;
  families?: number;
  groups?: number;
  [key: string]: number | undefined;
}

export interface PaymentBreakdownItem {
  id?: string;
  label: string;
  ageGroup?: AgeGroupType;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  sortOrder?: number;
}

export interface PricingCalculation {
  breakdown: PaymentBreakdownItem[];
  totalAmount: number;
  currency: string;
  requiresPayment: boolean;
  paymentMethod: PaymentMethod;
}

// ─────────────────────────────────────────
// REGISTRATION
// ─────────────────────────────────────────

export interface Registration {
  id: string;
  registrationNumber: string;
  activityLocationId: string;
  userId: string | null;
  pricingRuleId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  address: string | null;
  startDate: Date;
  endDate: Date;
  numberOfDays: number;
  notes: string | null;
  status: RegistrationStatus;
  guestCounts: GuestCounts;
  totalAmount: number | null;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  paymentNotes: string | null;
  paidAt: Date | null;
  editToken: string;
  editTokenExpiresAt: Date | null;
  source: string | null;
  embedTokenId: string | null;
  createdAt: Date;
  updatedAt: Date;
  activityLocation?: ActivityLocation;
  user?: User | null;
  pricingRule?: PricingRule | null;
  registrationSpots?: RegistrationSpot[];
  paymentBreakdown?: PaymentBreakdownItem[];
}

export interface RegistrationSpot {
  id: string;
  registrationId: string;
  spotId: string;
  createdAt: Date;
  spot?: Spot;
}

// ─────────────────────────────────────────
// EMBED TOKEN
// ─────────────────────────────────────────

export interface EmbedToken {
  id: string;
  token: string;
  placeId: string;
  activityLocationId: string | null;
  label: string;
  isActive: boolean;
  allowedOrigins: string[];
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  useCount: number;
  createdAt: Date;
  updatedAt: Date;
  place?: Place;
  activityLocation?: ActivityLocation | null;
}

// ─────────────────────────────────────────
// API RESPONSE TYPES
// ─────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  success: false;
  error: string;
  details?: Record<string, string[]>;
}

// ─────────────────────────────────────────
// FORM TYPES
// ─────────────────────────────────────────

export interface PlaceFormData {
  name: string;
  description?: string;
  slug: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  timezone: string;
}

export interface ActivityTypeFormData {
  placeId: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  sortOrder?: number;
}

export interface ActivityLocationFormData {
  placeId: string;
  activityTypeId: string;
  name: string;
  description?: string;
  maxCapacity?: number;
  requiresSpot?: boolean;
  mapWidth?: number;
  mapHeight?: number;
}

export interface SpotFormData {
  activityLocationId: string;
  name: string;
  description?: string;
  code?: string;
  maxPeople?: number;
  amenities?: string[];
  status?: SpotStatus;
  sortOrder?: number;
}

export interface PricingRuleFormData {
  activityTypeId?: string;
  activityLocationId?: string;
  name: string;
  description?: string;
  pricingType: PricingType;
  paymentMethod: PaymentMethod;
  requiresPayment?: boolean;
  currency?: string;
  minDays?: number;
  maxDays?: number;
  minPeople?: number;
  maxPeople?: number;
  pricingTiers: PricingTierFormData[];
}

export interface PricingTierFormData {
  ageGroup: AgeGroupType;
  label: string;
  minAge?: number;
  maxAge?: number;
  pricePerUnit: number;
  sortOrder?: number;
}

// ─────────────────────────────────────────
// REGISTRATION STEPPER FORM
// ─────────────────────────────────────────

export interface RegistrationStep1Data {
  activityLocationId: string;
  placeId?: string;
}

export interface RegistrationStep2Data {
  spotIds: string[];
  startDate: string;
  endDate: string;
  numberOfDays: number;
}

export interface RegistrationStep3Data {
  guestCounts: GuestCounts;
  pricingRuleId?: string;
  paymentMethod?: PaymentMethod;
  notes?: string;
}

export interface RegistrationStep4Data {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
}

export type RegistrationFormData = RegistrationStep1Data &
  RegistrationStep2Data &
  RegistrationStep3Data &
  RegistrationStep4Data & {
    pricing?: PricingCalculation;
  };

export interface RegistrationCreateInput {
  activityLocationId: string;
  spotIds?: string[];
  pricingRuleId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  startDate: string;
  endDate: string;
  notes?: string;
  guestCounts: GuestCounts;
  paymentMethod?: PaymentMethod;
  embedTokenId?: string;
  source?: string;
}

// ─────────────────────────────────────────
// REVIEW
// ─────────────────────────────────────────

export interface Review {
  id: string;
  placeId: string;
  activityLocationId: string | null;
  registrationId: string;
  userId: string | null;
  guestName: string;
  guestEmail: string;
  rating: number;           // 1–5
  title: string | null;
  body: string;
  isApproved: boolean;
  isRejected: boolean;
  createdAt: Date;
  updatedAt: Date;
  place?: Place;
  activityLocation?: ActivityLocation | null;
  registration?: Registration;
  user?: User | null;
}

// ─────────────────────────────────────────
// DASHBOARD / STATS
// ─────────────────────────────────────────

export interface DashboardStats {
  totalRegistrations: number;
  pendingRegistrations: number;
  confirmedRegistrations: number;
  totalRevenue: number;
  totalPlaces?: number;
  totalUsers?: number;
  recentRegistrations?: Registration[];
}

export interface SpotMapData {
  location: ActivityLocation;
  spots: (Spot & { availability: 'available' | 'booked' | 'partial' })[];
  checkinDate?: string;
  checkoutDate?: string;
}
