import { SxProps, useTheme } from '@mui/material';
import { fontFamily } from 'theme/typography';
import useChartTheme from 'design-system/hooks/useChartTheme';
import { useMemo } from 'react';
import { graphic } from 'echarts';
import * as echarts from 'echarts/core';
import ReactEchart from 'components/base/ReactEchart';

interface CompletedTaskChartProps {
  data: { date: string; value: number }[];
  sx?: SxProps;
}

const CompletedTaskChart = ({ data, ...rest }: CompletedTaskChartProps) => {
  const theme = useTheme();
  const chartTheme = useChartTheme();

  // The single series is the cyan `secondary.main`, third in the chart palette, rather than the
  // first entry a one-series chart would otherwise take.
  const seriesColor = chartTheme.seriesColors[2];

  const option = useMemo(
    () => ({
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'none',
        },
        backgroundColor: chartTheme.tooltipBg,
        textStyle: { color: chartTheme.textColor },
      },
      grid: {
        top: 30,
        bottom: 70,
        left: 30,
        right: 0,
      },
      xAxis: {
        type: 'category',
        data: data.map((item) => item.date),
        axisTick: {
          show: false,
        },
        axisLine: {
          show: false,
        },
        axisLabel: {
          margin: 10,
          color: chartTheme.axisColor,
          fontSize: theme.typography.caption.fontSize,
          fontFamily: fontFamily.monaSans,
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: chartTheme.axisColor,
          fontSize: theme.typography.caption.fontSize,
          fontFamily: fontFamily.monaSans,
        },
        splitLine: {
          show: false,
        },
      },
      series: [
        {
          data: data.map((item) => item.value),
          type: 'line',
          showSymbol: false,
          lineStyle: {
            color: seriesColor,
            width: 1.2,
          },
          areaStyle: {
            color: new graphic.LinearGradient(0, 0, 0, 1, [
              {
                offset: 0,
                color: `${seriesColor}33`,
              },
              {
                offset: 1,
                color: `${seriesColor}00`,
              },
            ]),
          },
        },
      ],
    }),
    [theme, chartTheme, seriesColor, data],
  );

  return <ReactEchart echarts={echarts} option={option} {...rest} />;
};

export default CompletedTaskChart;
