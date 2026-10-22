import { requestBlob } from './api';

export type ExpectedPaymentsStatus = 'active' | 'transferred' | 'all';

export interface ExpectedPaymentsReportParams {
  columns: string[];
  /** One class of this school; left out, the report covers every class. */
  schoolClassId?: number;
  /** `active` (the API's default), `transferred` or `all`. */
  status?: ExpectedPaymentsStatus;
}

/**
 * GET .../billing/reports/expected_payments — each child's expected monthly amount per class,
 * with their guardians, as a PDF.
 *
 * Fetched rather than linked: the endpoint needs the bearer token, which an `<a href>` cannot
 * carry.
 */
export const fetchExpectedPaymentsReport = async (
  schoolId: number,
  { columns, schoolClassId, status }: ExpectedPaymentsReportParams,
): Promise<Blob> => {
  const query = new URLSearchParams({ columns: columns.join(',') });
  if (schoolClassId !== undefined) query.set('school_class_id', String(schoolClassId));
  if (status && status !== 'active') query.set('status', status);

  return requestBlob(`/api/v1/schools/${schoolId}/billing/reports/expected_payments?${query}`);
};
