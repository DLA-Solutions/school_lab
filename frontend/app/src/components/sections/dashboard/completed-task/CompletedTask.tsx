import { useMemo } from 'react';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import RateChip from 'components/common/RateChip';
import IconifyIcon from 'components/base/IconifyIcon';
import { SectionCard } from 'design-system';
import { DashboardMetrics } from 'types/dashboard';
import { formatCents } from 'utils/money';
import { monthNumber } from 'utils/month';
import { useTranslation } from 'providers/I18nContext';
import type { MessageKey } from 'locales';
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
  const { t } = useTranslation();
  const series = useMemo(() => metrics?.monthly_income_series ?? [], [metrics]);

  const data = useMemo(
    () =>
      series.map((point) => ({
        // Three letters is what an axis has room for, in either language.
        date: t(`month.${monthNumber(point.month)}` as MessageKey).slice(0, 3),
        // The chart plots reais: cents would put the axis in the hundreds of thousands.
        value: point.amount_cents / 100,
      })),
    [series, t],
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
      : t('dashboard.kpi.new');

  return (
    <SectionCard padding={2.25}>
      <Stack sx={{ height: 300 }} direction="column">
      <Stack alignItems="center" spacing={0.6}>
        <IconifyIcon icon="ph:trend-up-fill" color="text.secondary" fontSize="h6.fontSize" />
        <Typography variant="body2" color="text.secondary">
          {t('dashboard.income.title')}
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
      </Stack>
    </SectionCard>
  );
};

export default SchoolIncome;
