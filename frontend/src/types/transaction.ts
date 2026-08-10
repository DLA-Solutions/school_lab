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

/** Catalogue keys, so a listing reads in the language the user picked. */
export const TRANSACTION_KIND_KEYS = {
  income: 'transaction.kind.income',
  expense: 'transaction.kind.expense',
} as const;

export const TRANSACTION_CATEGORY_KEYS = {
  didactic_material: 'transaction.category.didactic_material',
  tuition: 'transaction.category.tuition',
  enrolment_fee: 'transaction.category.enrolment_fee',
  events: 'transaction.category.events',
  donation: 'transaction.category.donation',
  payroll: 'transaction.category.payroll',
  rent: 'transaction.category.rent',
  utilities: 'transaction.category.utilities',
  supplies: 'transaction.category.supplies',
  maintenance: 'transaction.category.maintenance',
  taxes: 'transaction.category.taxes',
  other: 'transaction.category.other',
} as const;
