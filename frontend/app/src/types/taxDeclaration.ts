import { Paginated } from 'types/academics';

/** Computed from aggregate `active_version_id`; never stored on the version row. */
export type TaxDeclarationVersionLifecycle = 'active' | 'superseded';

export interface TaxDeclarationStudentSummary {
  student_id: number;
  student_name: string;
  declared_principal_amount_cents: number;
}

/** Mirrors `TaxDeclarationVersionBlueprint`. */
export interface TaxDeclarationVersion {
  id: number;
  number: number;
  lifecycle: TaxDeclarationVersionLifecycle;
  supersedes_version_id: number | null;
  total_declared_principal_amount_cents: number;
  issued_at: string | null;
  students: TaxDeclarationStudentSummary[];
  pdf_url: string;
}

/** One logical payer/school/calendar-year aggregate with active version metadata. */
export interface TaxDeclarationListItem {
  tax_declaration_id: number;
  calendar_year: number;
  active_version_id: number | null;
  version: TaxDeclarationVersion | null;
}

/** POST ensure-generation success payload. */
export interface TaxDeclarationEnsureResult {
  tax_declaration_id: number;
  calendar_year: number;
  active_version_id: number;
  version: TaxDeclarationVersion;
}

export type MyTaxDeclarationListResponse = Paginated<TaxDeclarationListItem>;
