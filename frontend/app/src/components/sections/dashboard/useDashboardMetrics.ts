import { useCallback, useEffect, useState } from 'react';
import { useCurrentSchool } from 'providers/useCurrentSchool';
import { ApiError } from 'services/api';
import { getDashboardMetrics } from 'services/dashboardApi';
import { DashboardMetrics } from 'types/dashboard';

export interface DashboardMetricsState {
  metrics: DashboardMetrics | null;
  loading: boolean;
  error: string;
  reload: () => void;
}

/**
 * The dashboard's figures, fetched once for the whole page: the KPI row, the income chart and the
 * ledger all read the same month, so they read the same response.
 */
export const useDashboardMetrics = (month: string): DashboardMetricsState => {
  const school = useCurrentSchool();
  const schoolId = school?.school_id ?? null;

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!schoolId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      setMetrics(await getDashboardMetrics(schoolId, month));
    } catch (err) {
      setMetrics(null);
      setError(err instanceof ApiError ? err.message : 'Could not load the dashboard figures.');
    } finally {
      setLoading(false);
    }
  }, [schoolId, month]);

  useEffect(() => {
    load();
  }, [load]);

  return { metrics, loading, error, reload: load };
};

export default useDashboardMetrics;
