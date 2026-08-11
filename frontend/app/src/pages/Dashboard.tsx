import { useState } from 'react';
import Grid from '@mui/material/Grid';
import { EmptyState, ErrorBanner } from 'design-system';
import KPIs from 'components/sections/dashboard/kpi/KPIs';
import StudentsByClass from 'components/sections/dashboard/students-by-class/StudentsByClass';
import SchoolIncome from 'components/sections/dashboard/completed-task/CompletedTask';
import Ledger from 'components/sections/dashboard/orders-status/OrdersStatus';
import useDashboardMetrics from 'components/sections/dashboard/useDashboardMetrics';
import { useCurrentSchool } from 'providers/useCurrentSchool';
import { useTranslation } from 'providers/I18nContext';
import { membershipHasPermission } from 'utils/onboarding/access';
import { currentMonth } from 'utils/month';

const Dashboard = () => {
  const { t } = useTranslation();
  const school = useCurrentSchool();
  const canViewBilling =
    school !== null &&
    (membershipHasPermission(school, 'view_billing_summary') ||
      membershipHasPermission(school, 'manage_billing'));
  const canManagePeople =
    school !== null && membershipHasPermission(school, 'manage_people');
  const hasContent = canViewBilling || canManagePeople;

  // One month drives the whole page: the KPI row, the income chart and the ledger all report it.
  const [month, setMonth] = useState(currentMonth);
  const { metrics, loading, error, reload } = useDashboardMetrics(month, hasContent);

  if (!hasContent) {
    return (
      <EmptyState
        title={t('dashboard.welcome.title')}
        description={t('dashboard.welcome.description')}
        headingLevel={2}
      />
    );
  }

  return (
    <Grid container spacing={{ xs: 2.5, sm: 3, lg: 3.75 }}>
      {error && (
        <Grid size={12}>
          <ErrorBanner message={error} />
        </Grid>
      )}

      {canViewBilling && (
        <Grid size={12}>
          <KPIs metrics={metrics} loading={loading} month={month} onMonthChange={setMonth} />
        </Grid>
      )}

      {canManagePeople && (
        <Grid size={{ xs: 12, xl: canViewBilling ? 4 : 12 }}>
          <StudentsByClass metrics={metrics} loading={loading} />
        </Grid>
      )}

      {canViewBilling && (
        <>
          <Grid size={{ xs: 12, xl: 8 }}>
            <SchoolIncome metrics={metrics} loading={loading} />
          </Grid>

          <Grid size={12}>
            <Ledger month={month} onChanged={reload} />
          </Grid>
        </>
      )}
    </Grid>
  );
};

export default Dashboard;
