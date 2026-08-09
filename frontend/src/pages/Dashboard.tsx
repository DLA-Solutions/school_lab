import { useState } from 'react';
import Grid from '@mui/material/Grid';
import { ErrorBanner } from 'design-system';
import KPIs from 'components/sections/dashboard/kpi/KPIs';
import Products from 'components/sections/dashboard/products/Products';
import RevenueByCustomer from 'components/sections/dashboard/revenue-by-customer/RevenueByCustomer';
import WebsiteVisitors from 'components/sections/dashboard/website-visitors/WebsiteVisitors';
import SchoolIncome from 'components/sections/dashboard/completed-task/CompletedTask';
import Ledger from 'components/sections/dashboard/orders-status/OrdersStatus';
import useDashboardMetrics from 'components/sections/dashboard/useDashboardMetrics';
import { currentMonth } from 'utils/month';

const Dashboard = () => {
  // One month drives the whole page: the KPI row, the income chart and the ledger all report it.
  const [month, setMonth] = useState(currentMonth);
  const { metrics, loading, error, reload } = useDashboardMetrics(month);

  return (
    <Grid container spacing={{ xs: 2.5, sm: 3, lg: 3.75 }}>
      {error && (
        <Grid size={12}>
          <ErrorBanner message={error} />
        </Grid>
      )}

      <Grid size={12}>
        <KPIs metrics={metrics} loading={loading} month={month} onMonthChange={setMonth} />
      </Grid>

      <Grid size={{ xs: 12, xl: 4 }}>
        <WebsiteVisitors />
      </Grid>

      <Grid size={{ xs: 12, xl: 8 }}>
        <RevenueByCustomer />
      </Grid>

      <Grid size={{ xs: 12, xl: 4 }}>
        <Products />
      </Grid>

      <Grid size={{ xs: 12, xl: 8 }}>
        <SchoolIncome metrics={metrics} loading={loading} />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Ledger month={month} onChanged={reload} />
      </Grid>
    </Grid>
  );
};

export default Dashboard;
