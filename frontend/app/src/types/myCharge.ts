/** Mirrors `ChargeBlueprint`'s `:guardian` view — `GET /me/charges`, `/me/charges/:id`, `/me/charges/:id/reissue`. */

export interface MyChargeStudent {
  id: number;
  name: string;
}

export interface MyChargePaymentMethods {
  boleto_url: string | null;
  pix_copy_paste: string | null;
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
