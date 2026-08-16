import type { ReportColumn } from 'components/sections/people/RegisterReportDialog';

/** Mirrors `People::RenderStudentsReportService::COLUMNS`, which decides what is actually drawn. */
export const STUDENT_REPORT_COLUMNS: ReportColumn[] = [
  { key: 'name', label: 'common.name' },
  { key: 'cpf', label: 'guardians.report.cpf' },
  { key: 'rg', label: 'students.report.rg' },
  { key: 'birth_date', label: 'common.birthDate' },
  { key: 'status', label: 'common.status' },
  { key: 'guardian_names', label: 'common.guardians' },
  { key: 'guardian_phones', label: 'students.report.guardianPhones' },
];

export const STUDENT_REPORT_DEFAULTS = ['name', 'birth_date', 'guardian_names', 'guardian_phones'];
