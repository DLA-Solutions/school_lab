export type ChargeStatus = 'pending' | 'overdue' | 'paid' | 'cancelled';

export interface Student {
  id: number;
  name: string;
}

export interface PaymentMethods {
  boleto_url: string | null;
  pix_copy_paste: string | null;
}

export interface Charge {
  id: number;
  billing_period: string;
  total_amount_cents: number;
  due_date: string;
  status: ChargeStatus;
  kind: string;
  description: string;
  billing_purpose_id: number;
  billing_purpose_code: string;
  tax_declaration_eligible: boolean;
  student: Student | null;
  contract_id: number | null;
  interest_rate_percent: number | null;
  payment_methods: PaymentMethods;
}

export interface ChargeHistoryItem {
  id: number;
  billing_period: string;
  total_amount_cents: number;
  status: ChargeStatus;
  kind: string;
  description: string;
  billing_purpose_id: number;
  billing_purpose_code: string;
  tax_declaration_eligible: boolean;
  student: Student | null;
  contract_id: number | null;
  interest_rate_percent: number | null;
  paid_at: string;
  source: string;
}

export interface PagyMeta {
  page: number;
  per_page: number;
  total: number;
}

export interface ChargeListResponse<T> {
  data: T[];
  meta: PagyMeta;
}
