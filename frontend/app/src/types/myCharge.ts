/** Mirrors `ChargeBlueprint` guardian views (`:guardian`, `:guardian_history`). */

export interface MyChargeStudent {
  id: number;
  name: string;
}

export interface MyChargePaymentMethods {
  boleto_url: string | null;
  pix_copy_paste: string | null;
}

/** Open charge or detail — `GET /me/charges`, `GET /me/charges/:id`. */
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
}

/** Paid charge row — `GET /me/charges/history`. */
export interface MyChargeHistory {
  id: number;
  billing_period: string | null;
  total_amount_cents: number;
  status: 'paid';
  kind: 'tuition' | 'one_off';
  description: string | null;
  contract_id: number | null;
  student: MyChargeStudent | null;
  paid_at: string;
  source: 'platform';
  interest_rate_percent: number | null;
}
