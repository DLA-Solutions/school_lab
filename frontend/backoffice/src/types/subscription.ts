import { SchoolOnboardingStatus } from 'types/onboarding';

export type SubscriptionStatus = 'active' | 'trial' | 'past_due';

/** Mirrors `PlatformPlanBlueprint`. */
export interface PlatformPlan {
  id: number;
  key: string;
  name: string;
  monthly_amount_cents: number;
  created_at: string;
  updated_at: string;
}

/** School summary embedded on subscription show/list. */
export interface SubscriptionSchoolSummary {
  id: number;
  name: string;
  onboarding_status: SchoolOnboardingStatus | null;
}

/** Mirrors `PlatformSubscriptionBlueprint`. */
export interface PlatformSubscription {
  id: number;
  school_id: number;
  platform_plan_id: number;
  status: SubscriptionStatus;
  trial_ends_at: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
  platform_plan?: PlatformPlan;
  school?: SubscriptionSchoolSummary;
}

export interface SubscriptionPayload {
  school_id: number;
  platform_plan_id: number;
  status?: SubscriptionStatus;
}

export interface SubscriptionUpdatePayload {
  platform_plan_id?: number;
  status?: SubscriptionStatus;
}

export type SubscriptionListFilters = {
  status?: SubscriptionStatus | '';
  school_id?: string;
};
