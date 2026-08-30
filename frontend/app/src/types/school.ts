import { SchoolOnboardingMode, SchoolOnboardingStatus } from 'types/onboarding';

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
  signature_email?: string | null;
  /** Whether the school has both a valid CNPJ and a signature e-mail — required to sign contracts. */
  signs_contracts?: boolean;
}

/** Backoffice create sends onboarding fields; school-admin self-serve create omits them. */
export interface SchoolPayload {
  name: string;
  cnpj?: string | null;
  address?: string | null;
  saas_plan?: string | null;
  onboarding_mode?: SchoolOnboardingMode;
  owner_email?: string;
}
