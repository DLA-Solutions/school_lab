export type PeriodTemplate = 'bimester' | 'trimester' | 'custom';

export type SchoolYearStatus = 'draft' | 'active' | 'archived';

export interface AcademicPeriodSummary {
  id: number;
  name: string;
  sequence: number;
  starts_on: string;
  ends_on: string;
  closure_status: 'open' | 'closing' | 'closed';
}

export interface SchoolYear {
  id: number;
  school_id: number;
  name: string;
  starts_on: string;
  ends_on: string;
  period_template: PeriodTemplate;
  status: SchoolYearStatus;
  timezone?: string;
  academic_periods?: AcademicPeriodSummary[];
}

export interface CreateSchoolYearPayload {
  name: string;
  starts_on: string;
  ends_on: string;
  period_template?: PeriodTemplate;
}

export interface ActivateSchoolYearResult {
  id: number;
  status: SchoolYearStatus;
  archived_year_id?: number | null;
}
