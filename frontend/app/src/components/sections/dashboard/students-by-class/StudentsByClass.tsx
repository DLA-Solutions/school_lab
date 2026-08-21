import { useMemo } from 'react';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import useChartTheme from 'design-system/hooks/useChartTheme';
import { EmptyState, SectionCard } from 'design-system';
import { DashboardMetrics } from 'types/dashboard';
import StudentsByClassChart from './StudentsByClassChart';
import { colorForIndex } from './sliceColors';
import { classLabel } from './classLabel';
import { useTranslation } from 'providers/I18nContext';

interface StudentsByClassProps {
  metrics: DashboardMetrics | null;
  loading: boolean;
}

/**
 * How the enrolled children are spread across the cohorts. The ring carries the shares and the
 * list beside it carries the numbers — colour alone never says which class is which, so every
 * slice is named in text too.
 */
const StudentsByClass = ({ metrics, loading }: StudentsByClassProps) => {
  const { t } = useTranslation();
  const chartTheme = useChartTheme();
  const data = useMemo(
    () =>
      (metrics?.students_by_class ?? []).map((slice) => ({
        label: classLabel(slice, t('dashboard.studentsByClass.unassigned')),
        students: slice.students,
      })),
    [metrics, t],
  );

  const total = data.reduce((sum, item) => sum + item.students, 0);

  return (
    <SectionCard padding={3.5}>
      <Stack sx={{ height: 500 }} direction="column">
      <Typography variant="h6" fontWeight={400}>
        {t('dashboard.studentsByClass.title')}
      </Typography>

      {loading ? (
        <Stack justifyContent="center" alignItems="center" sx={{ height: 400 }}>
          <Skeleton variant="circular" width={220} height={220} />
        </Stack>
      ) : total === 0 ? (
        <Box mt={4}>
          <EmptyState
            title={t('dashboard.studentsByClass.empty.title')}
            description={t('dashboard.studentsByClass.empty.description')}
            headingLevel={3}
          />
        </Box>
      ) : (
        <>
          <StudentsByClassChart data={data} sx={{ height: '260px !important' }} />

          <Stack direction="column" spacing={1.25} mt={1} sx={{ maxHeight: 150, overflowY: 'auto' }}>
            {data.map((item, index) => (
              <Stack key={item.label} alignItems="center" justifyContent="space-between">
                <Stack spacing={1} alignItems="center" minWidth={0}>
                  <Box
                    height={8}
                    width={8}
                    borderRadius={1}
                    flexShrink={0}
                    sx={{ bgcolor: colorForIndex(chartTheme.seriesColors, index) }}
                  />
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {item.label}
                  </Typography>
                </Stack>

                <Typography variant="body2" color="text.primary">
                  {`${item.students} (${Math.round((item.students / total) * 100)}%)`}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </>
      )}
      </Stack>
    </SectionCard>
  );
};

export default StudentsByClass;
