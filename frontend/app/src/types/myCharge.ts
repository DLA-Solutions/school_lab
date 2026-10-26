/** Mirrors `ChargeBlueprint`'s `:guardian` view — `GET /me/charges`, `/me/charges/:id`, `/me/charges/:id/reissue`. */

export interface MyChargeStudent {
  id: number;
  name: string;
}

/**
 * How a guardian can pay one boleto. Always the same four keys, absent only from the legacy
 * `/me/charges/history` view.
 *
 * Banco Inter issues asynchronously, so right after issuing all three data fields can still be
 * `null` / `false` for a while; the screen treats that as "being generated", not as "no way to pay".
 */
export interface MyChargePaymentMethods {
  /** Provider-hosted boleto (Cora). Always `null` for Banco Inter, which has no hosted link. */
  boleto_url: string | null;
  /** Pix "copia e cola" (EMV). */
  pix_copy_paste: string | null;
  /** Boleto "linha digitável", already formatted with dots and spaces. */
  digitable_line: string | null;
  /** True when `GET .../me/charges/:id/boleto_pdf` can serve the boleto PDF (Banco Inter). */
  boleto_pdf_available: boolean;
}

/** A guardian's boleto, any status — `GET /me/charges` returns a single ascending list of these. */
export interface MyCharge {
  id: number;
  billing_period: string | null;
  total_amount_cents: number;
  due_date: string | null;
  status: 'pending' | 'overdue' | 'paid' | 'cancelled';
  kind: 'tuition' | 'one_off';
  description: string | null;
  contract_id: number | null;
  student: MyChargeStudent | null;
  /** Monthly mora rate from school settings; null when unset. */
  interest_rate_percent: number | null;
  payment_methods: MyChargePaymentMethods;
  /** Null until the charge is paid; populated once it settles. */
  paid_at: string | null;
}
