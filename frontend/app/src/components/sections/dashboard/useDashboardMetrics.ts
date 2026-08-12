import { useCallback, useEffect, useState } from 'react';
import { useCurrentSchool } from 'providers/useCurrentSchool';
import { ApiError } from 'services/api';
import { getDashboardMetrics } from 'services/dashboardApi';
import { DashboardMetrics } from 'types/dashboard';

export interface DashboardMetricsState {
  metrics: DashboardMetrics | null;
  loading: boolean;
  error: string;
  accessDenied: boolean;
  reload: () => void;
}

const isAccessDeniedError = (err: unknown): err is ApiError =>
  err instanceof ApiError && (err.status === 403 || err.status === 404);

/**
 * The dashboard's figures, fetched once for the whole page: the KPI row, the income chart and the
 * ledger all read the same month, so they read the same response.
 */
export const useDashboardMetrics = (month: string, enabled = true): DashboardMetricsState => {
  const school = useCurrentSchool();
  const schoolId = school?.school_id ?? null;

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);

  const load = useCallback(async () => {
    if (!schoolId || !enabled) {
      setMetrics(null);
      setLoading(false);
      setError('');
      setAccessDenied(false);
      return;
    }

    setLoading(true);
    setError('');
    setAccessDenied(false);

    try {
      setMetrics(await getDashboardMetrics(schoolId, month));
    } catch (err) {
      setMetrics(null);
      if (isAccessDeniedError(err)) {
        setAccessDenied(true);
        setError('');
      } else {
        setError(err instanceof ApiError ? err.message : 'Could not load the dashboard figures.');
      }
    } finally {
      setLoading(false);
    }
  }, [schoolId, month, enabled]);

  useEffect(() => {
    load();
  }, [load]);

  return { metrics, loading, error, accessDenied, reload: load };
};

export default useDashboardMetrics;
