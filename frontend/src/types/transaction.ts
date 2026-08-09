/** Mirrors `SchoolTransactionBlueprint` (web/app/blueprints/school_transaction_blueprint.rb). */

export type TransactionKind = 'income' | 'expense';

export type TransactionCategory =
  | 'didactic_material'
  | 'tuition'
  | 'enrolment_fee'
  | 'events'
  | 'donation'
  | 'payroll'
  | 'rent'
  | 'utilities'
  | 'supplies'
  | 'maintenance'
  | 'taxes'
  | 'other';

export interface SchoolTransaction {
  id: number;
  kind: TransactionKind;
  category: TransactionCategory;
  description: string | null;
  amount_cents: number;
  occurred_on: string;
  /** Negative on an expense, so a mixed list totals without re-deriving the direction. */
  signed_amount_cents: number;
}

export interface SchoolTransactionPayload {
  kind: TransactionKind;
  category: TransactionCategory;
  amount_cents: number;
  occurred_on: string;
  description?: string | null;
}

export const TRANSACTION_KIND_LABELS: Record<TransactionKind, string> = {
  income: 'Entrada',
  expense: 'Saída',
};

export const TRANSACTION_CATEGORY_LABELS: Record<TransactionCategory, string> = {
  didactic_material: 'Material didático',
  tuition: 'Mensalidade',
  enrolment_fee: 'Matrícula',
  events: 'Eventos',
  donation: 'Doação',
  payroll: 'Folha de pagamento',
  rent: 'Aluguel',
  utilities: 'Contas de consumo',
  supplies: 'Suprimentos',
  maintenance: 'Manutenção',
  taxes: 'Impostos',
  other: 'Outros',
};
