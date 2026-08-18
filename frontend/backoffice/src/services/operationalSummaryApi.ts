import { OperationalSummary } from 'types/operationalSummary';
import { request } from './api';

const PATH = '/api/v1/platform/operational_summary';

/** GET /api/v1/platform/operational_summary — cross-tenant ops alerts (E1). */
export const fetchOperationalSummary = async (): Promise<OperationalSummary> => {
  const response = await request<{ data: OperationalSummary }>(PATH);

  return response.data;
};
