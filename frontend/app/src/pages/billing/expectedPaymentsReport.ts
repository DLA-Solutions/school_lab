import type { ReportColumn } from 'components/sections/people/RegisterReportDialog';

/** Mirrors the API's expected payments report columns, which decide what is actually drawn. */
export const EXPECTED_PAYMENTS_REPORT_COLUMNS: ReportColumn[] = [
  { key: 'student', label: 'common.student' },
  { key: 'guardians', label: 'common.guardians' },
  { key: 'plan', label: 'common.plan' },
  { key: 'signature_status', label: 'dashboard.expectedPayments.signatureStatus' },
  { key: 'expected_amount', label: 'dashboard.expectedPayments.expectedAmount' },
];

export const EXPECTED_PAYMENTS_REPORT_DEFAULTS = ['student', 'guardians', 'expected_amount'];
