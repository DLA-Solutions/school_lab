import { SchoolOnboardingMode, SchoolOnboardingStatus } from 'types/onboarding';
import { SchoolModulesMap } from 'types/modules';
import { SchoolYear } from 'types/schoolYear';

/** Aggregate counts returned on backoffice tenant detail — no PII (BR-BOE03). */
export interface SchoolAggregateCounts {
  students_count: number;
  staff_count: number;
}

/** Mirrors `SchoolBlueprint` (web/app/blueprints/school_blueprint.rb). */
export interface School {
  id: number;
  name: string;
  cnpj: string | null;
  address: string | null;
  saas_plan: string | null;
  school_group_id: number | null;
  onboarding_status?: SchoolOnboardingStatus;
  onboarding_mode?: SchoolOnboardingMode;
  billing_waived_at?: string | null;
  segments_skipped_at?: string | null;
  /** Where the school signs its contracts from. Null means it does not sign them at all. */
  signature_email?: string | null;
  /** Derived by the API: needs both the address above and a valid CNPJ. */
  signs_contracts?: boolean;
  created_at?: string;
  discarded_at?: string | null;
}

/** Extended show payload when `?include=modules,active_school_year,aggregate_counts`. */
export interface SchoolDetail extends School {
  modules?: SchoolModulesMap;
  active_school_year?: SchoolYear | null;
  aggregate_counts?: SchoolAggregateCounts;
}

/** Backoffice create sends onboarding fields; school-admin self-serve create omits them. */
export interface SchoolPayload {
  name: string;
  cnpj?: string | null;
  address?: string | null;
  saas_plan?: string | null;
  onboarding_mode?: SchoolOnboardingMode;
  owner_email?: string;
  signature_email?: string | null;
}

export type OwnerInviteEmailStatus = 'queued' | 'not_configured';

export type CreateSchoolMeta = {
  owner_invite_email_status?: OwnerInviteEmailStatus;
};

export type CreateSchoolResult = {
  school: School;
  meta?: CreateSchoolMeta;
};
