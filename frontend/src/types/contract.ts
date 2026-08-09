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
  signature_status: 'pending_signature' | 'signed';
  sent_at: string | null;
  signed_at: string | null;
  /** Which integration carried it — `autentique`, or `fake` in development. */
  signature_provider: string | null;
  signature_requested_at: string | null;
  /**
   * Whether the agreement actually reached the provider. A contract can exist while its send
   * failed, so "created" and "in the family's inbox" are different things.
   */
  sent_to_provider: boolean;
}

export interface ContractPayload {
  student_id: number;
  billing_plan_id: number;
  negotiated_amount_cents: number;
  due_day?: number | null;
  starts_on?: string | null;
}

export interface ContractListResponse {
  data: Contract[];
  meta: { page: number; per_page: number; total: number };
}

export interface ContractResponse {
  data: Contract;
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
