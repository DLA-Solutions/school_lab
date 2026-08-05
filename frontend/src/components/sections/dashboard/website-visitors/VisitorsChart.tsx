import { type SxProps, useTheme } from '@mui/material';
import { fontFamily } from 'theme/typography';
import { useMemo } from 'react';
import useChartTheme from 'design-system/hooks/useChartTheme';
import { seriesIndexFor } from './visitorsSeries';
import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { PolarComponent, TooltipComponent, GraphicComponent } from 'echarts/components';
import ReactEchart from 'components/base/ReactEchart';
import EChartsReactCore from 'echarts-for-react/lib/core';

echarts.use([PolarComponent, TooltipComponent, GraphicComponent, BarChart, CanvasRenderer]);

interface PolarBarChartProps {
  data: { type: string; count: number }[];
  chartRef: React.RefObject<EChartsReactCore | null>;
  sx?: SxProps;
}

const VisitorsChart = ({ chartRef, data, ...rest }: PolarBarChartProps) => {
  const theme = useTheme();
  const chartTheme = useChartTheme();

  const option = useMemo(
    () => ({
      polar: {
        radius: [80, '75%'],
      },
      angleAxis: {
        max: 100,
        startAngle: 180,
        axisLine: {
          show: false,
        },
        splitLine: {
          show: false,
        },
        axisTick: {
          show: false,
        },
        axisLabel: {
          show: false,
        },
      },
      radiusAxis: {
        show: false,
        type: 'category',
        data: data.map((item) => item.type),
      },
      tooltip: {
        backgroundColor: chartTheme.tooltipBg,
        textStyle: { color: chartTheme.textColor },
      },
      series: [
        {
          type: 'bar',
          data: data.map((item) => ({
            type: item.type,
            value: item.count,
            itemStyle: { color: chartTheme.seriesColors[seriesIndexFor(item.type)] },
          })),
          coordinateSystem: 'polar',
          barCategoryGap: '35%',
          label: {
            show: false,
          },
        },
      ],
      graphic: [
        {
          type: 'text',
          left: 'center',
          top: 'middle',
          style: {
            text: '150k',
            fill: chartTheme.strongTextColor,
            fontSize: theme.typography.h3.fontSize,
            fontFamily: fontFamily.workSans,
            fontWeight: 500,
            letterSpacing: 1,
          },
        },
      ],
    }),
    [theme, chartTheme, data],
  );

  return <ReactEchart ref={chartRef} echarts={echarts} option={option} {...rest} />;
};

export default VisitorsChart;
