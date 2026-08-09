import { ReactNode } from 'react';
import { fontFamily } from 'theme/typography';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import IconifyIcon from 'components/base/IconifyIcon';
import RateChip from 'components/common/RateChip';

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
}

const KPI = (props: KPIProps) => {
  const { icon, title, value, rate, isUp, caption, loading, action } = props;

  return (
    <Grid size={{ xs: 12, sm: 6, lg: 4, xl: 2.4 }}>
      <Stack
        component={Paper}
        direction="column"
        p={2.25}
        pl={2.5}
        gap={1.5}
        minHeight={116}
        width={1}
      >
        <Stack justifyContent="space-between">
          <Stack alignItems="center" gap={1}>
            <IconifyIcon icon={icon} color="primary.main" fontSize="h5.fontSize" />
            <Typography variant="subtitle2" color="text.secondary" fontFamily={fontFamily.workSans}>
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

        {caption && !loading && (
          <Typography variant="caption" color="text.secondary" mt={-0.75}>
            {caption}
          </Typography>
        )}
      </Stack>
    </Grid>
  );
};

export default KPI;
