import { SchoolOnboardingStatus } from 'types/onboarding';

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete';

export type BillingInterval = 'month' | 'year';

export type SubscriptionProvider = 'asaas' | 'manual' | 'fake';

export type CollectionMethod = 'automatic' | 'send_invoice' | 'manual';

export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';

export type InvoicePaymentMethod = 'credit_card' | 'bank_slip' | 'pix';

/** Interval price on a catalog plan (`PlatformPlanBlueprint`). */
export interface PlanIntervalPrice {
  billing_interval: BillingInterval;
  amount_cents: number;
  provider?: SubscriptionProvider;
}

/** Mirrors `PlatformPlanBlueprint`. */
export interface PlatformPlan {
  id: number;
  key: string;
  name: string;
  monthly_amount_cents: number;
  intervals?: PlanIntervalPrice[];
  created_at: string;
  updated_at: string;
}

/** School summary embedded on subscription show/list. */
export interface SubscriptionSchoolSummary {
  id: number;
  name: string;
  onboarding_status: SchoolOnboardingStatus | null;
}

/** Mirrors `PlatformSubscriptionBlueprint` (backoffice view). */
export interface PlatformSubscription {
  id: number;
  school_id: number;
  platform_plan_id: number;
  status: SubscriptionStatus;
  trial_ends_at: string | null;
  current_period_start?: string | null;
  current_period_end: string | null;
  billing_interval?: BillingInterval | null;
  provider?: SubscriptionProvider;
  collection_method?: CollectionMethod;
  cancel_at_period_end?: boolean;
  canceled_at?: string | null;
  external_customer_id?: string | null;
  external_subscription_id?: string | null;
  created_at: string;
  updated_at: string;
  platform_plan?: PlatformPlan;
  school?: SubscriptionSchoolSummary;
}

/** Mirrors `PlatformInvoiceBlueprint` (backoffice view may include vendor ids). */
export interface PlatformInvoice {
  id: number;
  status: InvoiceStatus;
  amount_cents: number;
  due_at: string | null;
  paid_at: string | null;
  hosted_invoice_url: string | null;
  payment_method: InvoicePaymentMethod | null;
  provider?: SubscriptionProvider;
  external_invoice_id?: string | null;
  school_id?: number;
  platform_subscription_id?: number;
}

export interface SubscriptionPayload {
  school_id: number;
  platform_plan_id: number;
  billing_interval: BillingInterval;
  provider: SubscriptionProvider;
  status?: SubscriptionStatus;
  trial?: boolean;
}

export interface SubscriptionUpdatePayload {
  status?: SubscriptionStatus;
  trial_ends_at?: string | null;
}

export interface CheckoutSession {
  checkout_url: string;
  billing_portal_url: null;
  subscription_id?: number;
}

export interface ChangePlanPayload {
  plan_key?: string;
  billing_interval: BillingInterval;
  platform_plan_id?: number;
}

export type SubscriptionListFilters = {
  status?: SubscriptionStatus | '';
  school_id?: string;
};

export const SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  'trialing',
  'active',
  'past_due',
  'canceled',
  'incomplete',
];

export const BILLING_INTERVALS: BillingInterval[] = ['month', 'year'];

export const ASSIGNABLE_PROVIDERS: SubscriptionProvider[] = ['manual', 'asaas'];

export const amountForPlan = (
  plan: PlatformPlan | undefined,
  interval: BillingInterval | null | undefined,
  provider?: SubscriptionProvider,
): number | null => {
  if (!plan) {
    return null;
  }

  const prices = plan.intervals ?? [];
  const matchingInterval = interval ?? 'month';
  const match =
    prices.find(
      (price) =>
        price.billing_interval === matchingInterval &&
        (provider == null || price.provider == null || price.provider === provider),
    ) ?? prices.find((price) => price.billing_interval === matchingInterval);

  return match?.amount_cents ?? plan.monthly_amount_cents ?? null;
};
