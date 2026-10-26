/** Mirrors `ChargeBlueprint` (web/app/blueprints/charge_blueprint.rb). */
export interface AppliedDiscount {
  id: number;
  discount_type: string;
  amount_cents: number;
}

export interface Charge {
  id: number;
  billing_period: string;
  original_amount_cents: number;
  discount_amount_cents: number;
  late_fee_amount_cents: number;
  total_amount_cents: number;
  due_date: string | null;
  status: 'pending' | 'overdue' | 'paid' | 'cancelled';
  /** `tuition` comes from the monthly schedule; `one_off` was raised by hand. */
  kind: 'tuition' | 'one_off';
  description: string | null;
  boleto_url: string | null;
  /** Null on a one-off the school raised outside any contract. */
  contract_id: number | null;
  /** Null when no contract ties the charge to a child. */
  student: { id: number; name: string } | null;
  /** Whose CPF the boleto is registered against. */
  guardian: { id: number; name: string; cpf: string };
  /** Present when a plan discount band was applied at generation (school view only). */
  applied_discounts?: AppliedDiscount[];
}

/**
 * A charge outside the monthly schedule. The payer is what matters: name a guardian outright, or
 * give a contract and let the API bill whoever answers for it. A contract is not required — a
 * school bills for plenty nobody signed for.
 */
export interface OneOffChargePayload {
  guardian_id?: number | null;
  contract_id?: number | null;
  /** What the charge is for. The API rejects a one-off without one. */
  billing_purpose_id: number;
  total_amount_cents: number;
  due_date: string;
  description?: string | null;
}

/**
 * A row of `GET .../billing/charge_batches` — one per enrolled student, ordered by name. Most rows
 * carry the student's standing contract, ready to be billed; a student with no contract comes back
 * flagged `without_contract`, with every contract-derived field empty, so the school can see who
 * is missing a contract rather than wondering why they are absent.
 */
export interface BillableContract {
  /** Null on a `without_contract` row — there is nothing to bill. */
  contract_id: number | null;
  student_id: number;
  student_name: string;
  payer: { id: number; name: string; cpf: string } | null;
  monthly_amount_cents: number | null;
  due_day: number | null;
  /** The period already has a tuition charge for this contract; billing again would duplicate it. */
  already_charged: boolean;
  /** The student is enrolled but has no contract yet; the row can be shown but never selected. */
  without_contract: boolean;
}

export interface ChargeBatchPayload {
  contract_ids: number[];
  /** `YYYY-MM`. */
  billing_period: string;
  /** Optional single date for the whole batch; each contract's own due day is used without it. */
  due_date?: string | null;
}

export interface ChargeBatchResult {
  created_charges: Charge[];
  created_count: number;
  /** Only contracts the period already has a charge for, so left alone. */
  skipped_contract_ids: number[];
  /** The school's contracts that cannot be billed: student not enrolled, or not the standing contract. */
  ineligible_contract_ids: number[];
  contract_ids_without_payer: number[];
}
