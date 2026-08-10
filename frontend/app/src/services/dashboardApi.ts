import { DashboardMetrics } from 'types/dashboard';
import { request } from './api';

/**
 * GET .../dashboard — the school's headline figures. `month` (`YYYY-MM`) moves the money ones
 * back through the year; head counts always compare against 1 January.
 */
export const getDashboardMetrics = async (
  schoolId: number,
  month?: string,
): Promise<DashboardMetrics> => {
  const query = month ? `?${new URLSearchParams({ month })}` : '';
  const response = await request<{ data: DashboardMetrics }>(
    `/api/v1/schools/${schoolId}/dashboard${query}`,
  );

  return response.data;
};
