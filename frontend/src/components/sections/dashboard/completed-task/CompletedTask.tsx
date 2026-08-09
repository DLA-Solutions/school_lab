import { useMemo } from 'react';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import RateChip from 'components/common/RateChip';
import IconifyIcon from 'components/base/IconifyIcon';
import { DashboardMetrics } from 'types/dashboard';
import { formatCents } from 'utils/money';
import { SHORT_MONTH_NAMES } from 'utils/month';
import CompletedTaskChart from './CompletedTaskChart';

interface SchoolIncomeProps {
  metrics: DashboardMetrics | null;
  loading: boolean;
}

/**
 * What the school took in, month by month, across the year on show. The headline is the year's
 * total; the chip compares the selected month against the one before it.
 */
const SchoolIncome = ({ metrics, loading }: SchoolIncomeProps) => {
  const series = useMemo(() => metrics?.monthly_income_series ?? [], [metrics]);

  const data = useMemo(
    () =>
      series.map((point) => ({
        date: SHORT_MONTH_NAMES[Number(point.month.split('-')[1]) - 1] ?? point.month,
        // The chart plots reais: cents would put the axis in the hundreds of thousands.
        value: point.amount_cents / 100,
      })),
    [series],
  );

  const totalCents = series.reduce((sum, point) => sum + point.amount_cents, 0);
  const selected = series.find((point) => point.month === metrics?.month);
  const index = series.findIndex((point) => point.month === metrics?.month);
  const previous = index > 0 ? series[index - 1] : undefined;

  const isUp = (selected?.amount_cents ?? 0) >= (previous?.amount_cents ?? 0);
  const rate =
    previous && previous.amount_cents > 0
      ? `${Math.abs(
          (((selected?.amount_cents ?? 0) - previous.amount_cents) / previous.amount_cents) * 100,
        ).toFixed(1)}%`
      : 'novo';

  return (
    <Paper sx={{ height: 300 }}>
      <Stack alignItems="center" spacing={0.6}>
        <IconifyIcon icon="ph:trend-up-fill" color="text.secondary" fontSize="h6.fontSize" />
        <Typography variant="body2" color="text.secondary">
          Entradas da escola ao longo do ano
        </Typography>
      </Stack>

      <Stack mt={1.5} alignItems="center" justifyContent="space-between">
        {loading ? (
          <Skeleton variant="rounded" height={36} width={220} />
        ) : (
          <Stack alignItems="center" gap={0.875}>
            <Typography variant="h3" fontWeight={600} letterSpacing={1}>
              {formatCents(totalCents)}
            </Typography>
            <RateChip rate={rate} isUp={isUp} />
          </Stack>
        )}
      </Stack>

      <CompletedTaskChart sx={{ height: '220px !important' }} data={data} />
    </Paper>
  );
};

export default SchoolIncome;
