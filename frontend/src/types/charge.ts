/** Mirrors `ChargeBlueprint` (web/app/blueprints/charge_blueprint.rb). */
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
  student: { id: number; name: string };
  /** Whose CPF the boleto is registered against. */
  guardian: { id: number; name: string; cpf: string };
}

export interface OneOffChargePayload {
  contract_id: number;
  total_amount_cents: number;
  due_date: string;
  description?: string | null;
}
