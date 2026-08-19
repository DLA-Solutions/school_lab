/**
 * School-scoped platform SaaS subscription (DLA → school).
 * Distinct from tuition billing (`/boletos`, `/planos`).
 * Mirrors `docs/api/v1/platform-and-admin.md` § Platform subscription billing.
 * JSON never includes raw Iugu customer/subscription/invoice ids.
 */

export type SchoolSubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete';

export type BillingInterval = 'month' | 'year';

export type CollectionMethod = 'automatic' | 'send_invoice' | 'manual';

export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';

export type InvoicePaymentMethod = 'credit_card' | 'bank_slip' | 'pix';

export const PLATFORM_PLAN_KEYS = ['starter', 'pro', 'enterprise'] as const;

export type PlatformPlanKey = (typeof PLATFORM_PLAN_KEYS)[number];

/** Interval price on GET /api/v1/schools/:school_id/platform_plans. */
export interface SchoolPlatformPlanInterval {
  billing_interval: BillingInterval;
  amount_cents: number;
}

/** School-scoped catalog row — names and prices come from the API, not i18n. */
export interface SchoolPlatformPlan {
  key: PlatformPlanKey | string;
  name: string;
  intervals: SchoolPlatformPlanInterval[];
}

export const amountForSchoolPlan = (
  plan: SchoolPlatformPlan | undefined,
  interval: BillingInterval,
): number | null =>
  plan?.intervals.find((row) => row.billing_interval === interval)?.amount_cents ?? null;

/** Open invoice nested on GET platform_subscription. */
export interface SchoolPlatformOpenInvoice {
  id: number;
  status: InvoiceStatus;
  amount_cents: number;
  due_at: string | null;
  hosted_invoice_url: string | null;
  payment_method: InvoicePaymentMethod | null;
}

/** GET /api/v1/schools/:school_id/platform_subscription — `data` may be null. */
export interface SchoolPlatformSubscription {
  id: number;
  status: SchoolSubscriptionStatus;
  plan_key: PlatformPlanKey | string;
  plan_name: string;
  billing_interval: BillingInterval;
  amount_cents: number;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
  cancel_at_period_end: boolean;
  collection_method: CollectionMethod;
  billing_portal_url: null;
  open_invoice: SchoolPlatformOpenInvoice | null;
}

export interface SchoolPlatformInvoice {
  id: number;
  status: InvoiceStatus;
  amount_cents: number;
  due_at: string | null;
  paid_at: string | null;
  hosted_invoice_url: string | null;
  payment_method: InvoicePaymentMethod | null;
}

export interface SchoolCheckoutPayload {
  plan_key: string;
  billing_interval: BillingInterval;
  trial?: boolean;
}

export interface SchoolCheckoutSession {
  checkout_url: string;
  billing_portal_url: null;
}

export interface SchoolChangePlanPayload {
  plan_key: string;
  billing_interval: BillingInterval;
}
