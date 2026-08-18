import { SchoolModuleKey } from 'types/modules';

export type ModuleAdoptionRates = Record<SchoolModuleKey, number>;

export interface OnboardingFunnelCounts {
  provisioning: number;
  pending_handoff: number;
  active: number;
}

/** GET /api/v1/platform/analytics/overview — aggregate KPIs, no PII. */
export interface AnalyticsOverview {
  active_schools: number;
  provisioning_count: number;
  module_adoption: ModuleAdoptionRates;
  mrr_cents: number;
  onboarding_funnel: OnboardingFunnelCounts;
}

export type AnalyticsOverviewFilters = {
  date_from?: string;
  date_to?: string;
};
