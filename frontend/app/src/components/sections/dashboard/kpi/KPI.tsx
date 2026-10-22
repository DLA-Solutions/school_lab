import { ReactNode } from 'react';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import IconifyIcon from 'components/base/IconifyIcon';
import RateChip from 'components/common/RateChip';
import { SectionCard } from 'design-system';

/** A second, labelled figure under the headline one — e.g. the same average with a discount. */
export interface KPISecondary {
  label: string;
  value: string;
}

export interface KPIProps {
  id: number | string;
  icon: string;
  title: string;
  value: string;
  rate: string;
  isUp: boolean;
  /** What the movement is measured against, e.g. "vs. janeiro". Sits under the figure. */
  caption?: string;
  loading?: boolean;
  /** Overflow control — a month picker on the cards where the month is a choice. */
  action?: ReactNode;
  /** A second labelled amount, shown under the headline figure. Omitted when there is none. */
  secondary?: KPISecondary;
}

const KPI = (props: KPIProps) => {
  const { id, icon, title, value, rate, isUp, caption, loading, action, secondary } = props;

  return (
    <Grid size={{ xs: 12, sm: 6, lg: 4, xl: 2.4 }}>
      <SectionCard padding={2.25}>
        <Stack direction="column" gap={1.5} minHeight={116} width={1} pl={0.25}>
        <Stack justifyContent="space-between">
          <Stack alignItems="center" gap={1}>
            <IconifyIcon icon={icon} color="primary.main" fontSize="h5.fontSize" />
            <Typography variant="subtitle2" color="text.secondary">
              {title}
            </Typography>
          </Stack>

          {action}
        </Stack>

        {loading ? (
          <Skeleton variant="rounded" height={36} width="70%" />
        ) : (
          <Stack alignItems="center" gap={0.875}>
            <Typography variant="h3" fontWeight={600} letterSpacing={1} noWrap>
              {value}
            </Typography>
            <RateChip rate={rate} isUp={isUp} />
          </Stack>
        )}

        {secondary && !loading && (
          <Stack direction="column" gap={0.25} mt={-0.5} data-testid={`kpi-${id}-secondary`}>
            <Typography variant="caption" color="text.secondary">
              {secondary.label}
            </Typography>
            <Typography variant="subtitle1" fontWeight={600} noWrap>
              {secondary.value}
            </Typography>
          </Stack>
        )}

        {caption && !loading && (
          <Typography variant="caption" color="text.secondary" mt={-0.75}>
            {caption}
          </Typography>
        )}
        </Stack>
      </SectionCard>
    </Grid>
  );
};

export default KPI;
