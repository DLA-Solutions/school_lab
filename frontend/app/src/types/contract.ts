import { SchoolClassShift } from 'types/academics';

/** Mirrors `ContractBlueprint` (web/app/blueprints/contract_blueprint.rb). */
export interface Contract {
  id: number;
  school_id: number;
  student_id: number;
  /** Denormalized by the blueprint so a list need not fetch each student. */
  student_name: string | null;
  billing_plan_id: number;
  /** Integer cents — format with `formatCents`. */
  negotiated_amount_cents: number | null;
  due_day: number | null;
  starts_on: string | null;
  ends_on: string | null;
  status: 'active' | 'suspended' | 'ended';
  /**
   * `cancelled` is a contract the school called off before it was signed — a wrong figure to
   * reissue, or a family that decided not to go ahead. It stays on record.
   */
  signature_status: 'pending_signature' | 'signed' | 'cancelled';
  sent_at: string | null;
  signed_at: string | null;
  signature_cancelled_at: string | null;
  /** Which integration carried it — `autentique`, or `fake` in development. */
  signature_provider: string | null;
  signature_requested_at: string | null;
  plan_discount_id: number | null;
  /** Whose CPF the boletos are registered against. */
  payer_guardian_id: number | null;
  payer_name: string | null;
  /**
   * Where the signed agreement itself can be read, once the family has signed it — the provider's
   * own PDF, with the signature page it appends. Null until then.
   */
  signed_document_url: string | null;
  /**
   * Whether the agreement actually reached the provider. A contract can exist while its send
   * failed, so "created" and "in the family's inbox" are different things.
   */
  sent_to_provider: boolean;
}

export interface ContractPayload {
  student_id: number;
  billing_plan_id: number;
  plan_discount_id?: number | null;
  payer_guardian_id?: number | null;
  negotiated_amount_cents: number;
  due_day?: number | null;
  starts_on?: string | null;
}

/** One signer as `Contracts::PrefillService` reports them. */
export interface PrefillGuardian {
  id: number;
  name: string;
  cpf: string | null;
  email: string | null;
  phone: string | null;
  relationship: 'father' | 'mother' | 'other';
  primary_guardian: boolean;
  /** Autentique needs an e-mail to reach them and a CPF to identify them. */
  can_sign: boolean;
  /** Which of those two are missing, so the school knows what to complete. */
  missing: string[];
}

/**
 * Everything a contract for one student would be built from. Mirrors
 * `Contracts::PrefillService` (web/app/services/contracts/prefill_service.rb).
 */
export interface ContractPrefill {
  student: {
    id: number;
    name: string;
    cpf: string | null;
    rg: string | null;
    birth_date: string | null;
    school_class_name: string | null;
    grade_level: string | null;
    shift: SchoolClassShift | null;
    year: number | null;
    /** The whole cohort, worded by the API so this screen and the contract cannot disagree. */
    school_class_label: string | null;
  };
  guardians: PrefillGuardian[];
  suggested: {
    payer_guardian_id: number | null;
    billing_plan_id: number | null;
    plan_discount_id: number | null;
    negotiated_amount_cents: number | null;
    due_day: number;
    starts_on: string;
  };
  /** Empty means the contract can go out as it stands. */
  blocking_issues: string[];
  /** The contract still goes out, with a gap someone has to fill in later. */
  warnings: string[];
}

export interface ContractListResponse {
  data: Contract[];
  meta: { page: number; per_page: number; total: number };
}

export interface ContractResponse {
  data: Contract;
}

/** A band the school grants against the full tuition. Mirrors `PlanDiscountBlueprint`. */
export interface PlanDiscount {
  id: number;
  school_id: number;
  name: string;
  /** 0–100. 100 is a full scholarship. */
  percent: number;
  /** True while contracts still point at it — removal is refused. */
  in_use: boolean;
}

/** Mirrors `BillingPlanBlueprint`. */
export interface BillingPlan {
  id: number;
  school_id: number;
  name: string;
  plan_type: string | null;
  base_amount_cents: number | null;
}

export interface BillingPlanListResponse {
  data: BillingPlan[];
  meta: { page: number; per_page: number; total: number };
}
