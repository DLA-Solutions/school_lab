import { useState } from 'react';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import { EmptyState, ErrorBanner } from 'design-system';
import IconifyIcon from 'components/base/IconifyIcon';
import ExpectedPaymentsReportDialog from 'components/sections/dashboard/ExpectedPaymentsReportDialog';
import KPIs from 'components/sections/dashboard/kpi/KPIs';
import StudentsByClass from 'components/sections/dashboard/students-by-class/StudentsByClass';
import SchoolIncome from 'components/sections/dashboard/completed-task/CompletedTask';
import Ledger from 'components/sections/dashboard/orders-status/OrdersStatus';
import useDashboardMetrics from 'components/sections/dashboard/useDashboardMetrics';
import { useCurrentSchool } from 'providers/useCurrentSchool';
import { useGuardianSchool } from 'providers/useGuardianSchool';
import { useTranslation } from 'providers/I18nContext';
import { membershipHasPermission } from 'utils/onboarding/access';
import { currentMonth } from 'utils/month';
import GuardianDashboard from './GuardianDashboard';

const Dashboard = () => {
  const { t } = useTranslation();
  const guardianSchool = useGuardianSchool();
  const school = useCurrentSchool();

  const canViewBillingSummary =
    school !== null &&
    (membershipHasPermission(school, 'view_billing_summary') ||
      membershipHasPermission(school, 'manage_billing'));

  const canManageLedger =
    school !== null && membershipHasPermission(school, 'manage_billing');

  // The report lists each family's figure, so `view_billing_summary` alone (which the API refuses
  // with 403) does not offer it.
  const canGenerateReport = school !== null && membershipHasPermission(school, 'manage_billing');

  const canViewPeopleMetrics =
    school !== null && membershipHasPermission(school, 'manage_people');

  const hasStaffContent = !guardianSchool && (canViewBillingSummary || canViewPeopleMetrics);

  const [month, setMonth] = useState(currentMonth);
  const [reportOpen, setReportOpen] = useState(false);
  const { metrics, loading, error, accessDenied, reload } = useDashboardMetrics(
    month,
    hasStaffContent,
  );

  if (guardianSchool) {
    return <GuardianDashboard />;
  }

  if (!hasStaffContent) {
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
      {canGenerateReport && school && (
        <Grid size={12}>
          <Stack direction="row" justifyContent="flex-end">
            <Button
              variant="contained"
              size="small"
              onClick={() => setReportOpen(true)}
              startIcon={<IconifyIcon icon="mingcute:file-export-line" />}
            >
              {t('dashboard.expectedPayments.action')}
            </Button>
          </Stack>

          <ExpectedPaymentsReportDialog
            key={String(reportOpen)}
            open={reportOpen}
            schoolId={school.school_id}
            onClose={() => setReportOpen(false)}
          />
        </Grid>
      )}

      {error && !accessDenied && (
        <Grid size={12}>
          <ErrorBanner message={error} />
        </Grid>
      )}

      {canViewBillingSummary && (
        <Grid size={12}>
          <KPIs metrics={metrics} loading={loading} month={month} onMonthChange={setMonth} />
        </Grid>
      )}

      {canViewPeopleMetrics && (
        <Grid size={{ xs: 12, xl: canViewBillingSummary ? 4 : 12 }}>
          <StudentsByClass metrics={metrics} loading={loading} />
        </Grid>
      )}

      {canViewBillingSummary && (
        <Grid size={{ xs: 12, xl: 8 }}>
          <SchoolIncome metrics={metrics} loading={loading} />
        </Grid>
      )}

      {canManageLedger && (
        <Grid size={12}>
          <Ledger month={month} onChanged={reload} />
        </Grid>
      )}
    </Grid>
  );
};

export default Dashboard;
