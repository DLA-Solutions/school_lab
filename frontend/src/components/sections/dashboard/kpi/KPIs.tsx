import Grid from '@mui/material/Grid';
import { DashboardMetric, DashboardMetrics } from 'types/dashboard';
import { formatCents } from 'utils/money';
import { formatMonth, previousMonth } from 'utils/month';
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
const rateLabel = (metric: DashboardMetric | undefined) => {
  if (!metric) {
    return '—';
  }
  if (metric.previous === 0) {
    return metric.value > 0 ? 'novo' : '0%';
  }

  return `${Math.abs(metric.change_percent).toFixed(1)}%`;
};

/**
 * The school in five numbers. Head counts are measured against 1 January — a child who enrolled
 * after the year turned is growth — and the money against the month before the one on show.
 */
const KPIs = ({ metrics, loading, month, onMonthChange }: KPIsProps) => {
  const sinceJanuary = 'desde 1º de janeiro';
  const versusPrevious = `vs. ${formatMonth(previousMonth(month))}`;
  const monthMenu = <MonthMenu value={month} onChange={onMonthChange} />;

  return (
    <Grid container spacing={{ xs: 2.5, sm: 3, lg: 3.75 }}>
      <KPI
        id="students"
        icon="ph:student-fill"
        title="Total de alunos"
        value={String(metrics?.students.value ?? 0)}
        rate={rateLabel(metrics?.students)}
        isUp={metrics?.students.is_up ?? true}
        caption={sinceJanuary}
        loading={loading}
      />

      <KPI
        id="collaborators"
        icon="mingcute:user-2-fill"
        title="Colaboradores"
        value={String(metrics?.collaborators.value ?? 0)}
        rate={rateLabel(metrics?.collaborators)}
        isUp={metrics?.collaborators.is_up ?? true}
        caption={sinceJanuary}
        loading={loading}
      />

      <KPI
        id="average-ticket"
        icon="ph:bag-simple-fill"
        title="Ticket médio"
        value={formatCents(metrics?.average_ticket.value ?? 0)}
        rate={rateLabel(metrics?.average_ticket)}
        isUp={metrics?.average_ticket.is_up ?? true}
        caption={`${metrics?.average_ticket.students ?? 0} aluno(s) matriculado(s)`}
        loading={loading}
      />

      <KPI
        id="monthly-revenue"
        icon="mingcute:currency-dollar-2-line"
        title="Receita do mês"
        value={formatCents(metrics?.monthly_revenue.value ?? 0)}
        rate={rateLabel(metrics?.monthly_revenue)}
        isUp={metrics?.monthly_revenue.is_up ?? true}
        caption={versusPrevious}
        loading={loading}
        action={monthMenu}
      />

      <KPI
        id="didactic-material"
        icon="solar:notebook-bold"
        title="Material didático"
        value={formatCents(metrics?.didactic_material.value ?? 0)}
        rate={rateLabel(metrics?.didactic_material)}
        isUp={metrics?.didactic_material.is_up ?? true}
        caption={versusPrevious}
        loading={loading}
        action={monthMenu}
      />
    </Grid>
  );
};

export default KPIs;
