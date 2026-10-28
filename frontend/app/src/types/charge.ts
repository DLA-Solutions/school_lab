import type { MyChargePaymentMethods } from 'types/myCharge';

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
  /**
   * How the payer can pay it: the hosted boleto (Cora), the Pix code, the linha digitável and
   * whether the API can relay the boleto PDF (Banco Inter). Same shape the guardian gets. All of
   * it can still be empty right after issuing, while the bank produces the boleto.
   */
  payment_methods: MyChargePaymentMethods;
  /** Null on a one-off the school raised outside any contract. */
  contract_id: number | null;
  /** Null when no contract ties the charge to a child. */
  student: { id: number; name: string } | null;
  /** Whose CPF the boleto is registered against. */
  guardian: { id: number; name: string; cpf: string };
  /** Present when a plan discount band was applied at generation (school view only). */
  applied_discounts?: AppliedDiscount[];
  /**
   * `platform` (the default) was issued through our system; `migrated` was imported from a
   * boleto the school created directly in the bank's own dashboard
   * (Billing::ImportExternalBoletosService).
   */
  source: 'platform' | 'migrated';
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
 * Why a row has no billable contract even though the student has contract history. Both can
 * apply together — an old contract was cancelled and its replacement is still unsigned — so this
 * is a list, not a single reason. Empty on a billable row and on a pure `without_contract` row
 * (no contract history at all); the two never overlap.
 */
export type BillableGap = 'cancelled' | 'pending_signature';

/**
 * Why a billable row (has a contract, `without_contract: false`) still carries a null `payer`.
 * Today the only named reason is the student having zero kept guardian links at all; null means
 * either the payer resolved fine or this is a `without_contract` row, where the gap is "no
 * contract," not the payer. A string union rather than a boolean so a future reason can be added
 * without a breaking shape change — treat an unrecognized value as "no specific reason given"
 * rather than assuming it cannot occur.
 */
export type PayerMissingReason = 'no_guardian_linked' | null;

/**
 * A row of `GET .../billing/charge_batches` — one per enrolled student, ordered by name. Most rows
 * carry the student's standing contract (active and signed), ready to be billed. A student whose
 * only contract history is a cancelled or still-unsigned one comes back with `contract_id: null`
 * and `tags` naming why; a student with no contract at all comes back flagged `without_contract`,
 * with empty `tags` — distinct from the tagged case, which has history. Either way every
 * contract-derived field is empty, so the school can see who is missing a billable contract rather
 * than wondering why they are absent.
 */
export interface BillableContract {
  /** Null on a `without_contract` row or a tagged row — neither has anything to bill. */
  contract_id: number | null;
  student_id: number;
  student_name: string;
  payer: { id: number; name: string; cpf: string } | null;
  /** Why `payer` is null on this row. See `PayerMissingReason`. */
  payer_missing_reason: PayerMissingReason;
  monthly_amount_cents: number | null;
  due_day: number | null;
  /** The period already has a tuition charge for this contract; billing again would duplicate it. */
  already_charged: boolean;
  /** The student is enrolled but has no contract at all; the row can be shown but never selected. */
  without_contract: boolean;
  /** Why this student has no billable contract despite having contract history. See `BillableGap`. */
  tags: BillableGap[];
}

/**
 * A row of `GET .../billing/billable_students` — the avulso flow's student-picker step. Same
 * eligibility and tag rules as `BillableContract`, period-agnostic: no amount, due day or
 * already-charged flag, since this listing is not scoped to one billing period.
 */
export interface BillableStudent {
  student_id: number;
  student_name: string;
  /** Null unless the student has a standing (active and signed) contract — only then selectable. */
  contract_id: number | null;
  payer: { id: number; name: string; cpf: string } | null;
  without_contract: boolean;
  tags: BillableGap[];
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
