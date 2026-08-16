import type { ReportColumn } from 'components/sections/people/RegisterReportDialog';

/** Mirrors `People::RenderGuardiansReportService::COLUMNS`, which decides what is actually drawn. */
export const GUARDIAN_REPORT_COLUMNS: ReportColumn[] = [
  { key: 'name', label: 'common.name' },
  { key: 'cpf', label: 'guardians.report.cpf' },
  { key: 'phone', label: 'common.phone' },
  { key: 'email', label: 'common.email' },
  { key: 'student_name', label: 'guardians.report.studentName' },
  { key: 'student_class', label: 'guardians.report.studentClass' },
];

// The cohort heads each page now, so it is no longer ticked by default.
export const GUARDIAN_REPORT_DEFAULTS = ['name', 'cpf', 'phone', 'student_name'];
