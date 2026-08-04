import { useMemo } from 'react';
import { useTheme } from '@mui/material/styles';
import { useColorScheme } from '@mui/material/styles';

export interface ChartTheme {
  textColor: string;
  axisColor: string;
  splitLineColor: string;
  seriesColors: string[];
  tooltipBg: string;
}

const useChartTheme = (): ChartTheme => {
  const theme = useTheme();
  const { mode } = useColorScheme();

  return useMemo(() => {
    const isDark = mode !== 'light';

    return {
      textColor: theme.palette.text.secondary,
      axisColor: theme.palette.text.secondary,
      splitLineColor: isDark ? theme.palette.grey[700] : theme.palette.grey[200],
      seriesColors: [
        theme.palette.primary.main,
        theme.palette.secondary.lighter,
        theme.palette.secondary.main,
        theme.palette.secondary.light,
        theme.palette.success.main,
        theme.palette.warning.main,
      ],
      tooltipBg: theme.palette.background.paper,
    };
  }, [theme, mode]);
};

export default useChartTheme;
