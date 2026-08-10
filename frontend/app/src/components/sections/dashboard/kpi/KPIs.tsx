import Grid from '@mui/material/Grid';
import { DashboardMetric, DashboardMetrics } from 'types/dashboard';
import { formatCents } from 'utils/money';
import { formatMonth, previousMonth } from 'utils/month';
import { useTranslation } from 'providers/I18nContext';
import KPI from './KPI';
import MonthMenu from './MonthMenu';

interface KPIsProps {
  metrics: DashboardMetrics | null;
  loading: boolean;
  /** The month the money cards describe, `YYYY-MM`. */
  month: string;
  onMonthChange: (month: string) => void;
}

/**
 * A rise from nothing has no percentage — 100% would read as a doubling of something that did
 * not exist. The card says so in words instead.
 */
const rateLabel = (metric: DashboardMetric | undefined, newLabel: string) => {
  if (!metric) {
    return '—';
  }
  if (metric.previous === 0) {
    return metric.value > 0 ? newLabel : '0%';
  }

  return `${Math.abs(metric.change_percent).toFixed(1)}%`;
};

/**
 * The school in five numbers. Head counts are measured against 1 January — a child who enrolled
 * after the year turned is growth — and the money against the month before the one on show.
 */
const KPIs = ({ metrics, loading, month, onMonthChange }: KPIsProps) => {
  const { t } = useTranslation();
  const sinceJanuary = t('dashboard.kpi.sinceJanuary');
  const versusPrevious = t('dashboard.kpi.versus', { month: formatMonth(previousMonth(month), t) });
  const monthMenu = <MonthMenu value={month} onChange={onMonthChange} />;

  return (
    <Grid container spacing={{ xs: 2.5, sm: 3, lg: 3.75 }}>
      <KPI
        id="students"
        icon="ph:student-fill"
        title={t('dashboard.kpi.students')}
        value={String(metrics?.students.value ?? 0)}
        rate={rateLabel(metrics?.students, t('dashboard.kpi.new'))}
        isUp={metrics?.students.is_up ?? true}
        caption={sinceJanuary}
        loading={loading}
      />

      <KPI
        id="collaborators"
        icon="mingcute:user-2-fill"
        title={t('dashboard.kpi.collaborators')}
        value={String(metrics?.collaborators.value ?? 0)}
        rate={rateLabel(metrics?.collaborators, t('dashboard.kpi.new'))}
        isUp={metrics?.collaborators.is_up ?? true}
        caption={sinceJanuary}
        loading={loading}
      />

      <KPI
        id="average-ticket"
        icon="ph:bag-simple-fill"
        title={t('dashboard.kpi.averageTicket')}
        value={formatCents(metrics?.average_ticket.value ?? 0)}
        rate={rateLabel(metrics?.average_ticket, t('dashboard.kpi.new'))}
        isUp={metrics?.average_ticket.is_up ?? true}
        caption={t('dashboard.kpi.enrolled', { count: metrics?.average_ticket.students ?? 0 })}
        loading={loading}
      />

      <KPI
        id="monthly-revenue"
        icon="mingcute:currency-dollar-2-line"
        title={t('dashboard.kpi.monthlyRevenue')}
        value={formatCents(metrics?.monthly_revenue.value ?? 0)}
        rate={rateLabel(metrics?.monthly_revenue, t('dashboard.kpi.new'))}
        isUp={metrics?.monthly_revenue.is_up ?? true}
        caption={versusPrevious}
        loading={loading}
        action={monthMenu}
      />

      <KPI
        id="didactic-material"
        icon="solar:notebook-bold"
        title={t('dashboard.kpi.didacticMaterial')}
        value={formatCents(metrics?.didactic_material.value ?? 0)}
        rate={rateLabel(metrics?.didactic_material, t('dashboard.kpi.new'))}
        isUp={metrics?.didactic_material.is_up ?? true}
        caption={versusPrevious}
        loading={loading}
        action={monthMenu}
      />
    </Grid>
  );
};

export default KPIs;
