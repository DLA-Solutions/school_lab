import { AnalyticsOverview, AnalyticsOverviewFilters } from 'types/analytics';
import { request } from './api';

const PATH = '/api/v1/platform/analytics/overview';

export const fetchAnalyticsOverview = async (
  filters: AnalyticsOverviewFilters = {},
): Promise<AnalyticsOverview> => {
  const params = new URLSearchParams();

  if (filters.date_from) {
    params.set('date_from', filters.date_from);
  }

  if (filters.date_to) {
    params.set('date_to', filters.date_to);
  }

  const query = params.toString();
  const response = await request<{ data: AnalyticsOverview }>(
    query ? `${PATH}?${query}` : PATH,
  );

  return response.data;
};
