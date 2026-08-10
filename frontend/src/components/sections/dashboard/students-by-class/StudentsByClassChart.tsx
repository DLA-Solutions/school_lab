import { type SxProps, useTheme } from '@mui/material';
import { fontFamily } from 'theme/typography';
import { useMemo } from 'react';
import useChartTheme from 'design-system/hooks/useChartTheme';
import * as echarts from 'echarts/core';
import { PieChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { TooltipComponent, GraphicComponent } from 'echarts/components';
import ReactEchart from 'components/base/ReactEchart';
import EChartsReactCore from 'echarts-for-react/lib/core';
import { colorForIndex } from './sliceColors';

echarts.use([TooltipComponent, GraphicComponent, PieChart, CanvasRenderer]);

export interface StudentsByClassDatum {
  label: string;
  students: number;
}

interface StudentsByClassChartProps {
  data: StudentsByClassDatum[];
  chartRef?: React.RefObject<EChartsReactCore | null>;
  sx?: SxProps;
}

const StudentsByClassChart = ({ chartRef, data, ...rest }: StudentsByClassChartProps) => {
  const theme = useTheme();
  const chartTheme = useChartTheme();

  const total = data.reduce((sum, item) => sum + item.students, 0);

  const option = useMemo(
    () => ({
      tooltip: {
        trigger: 'item',
        backgroundColor: chartTheme.tooltipBg,
        textStyle: { color: chartTheme.textColor },
        // ECharts formats the share itself; naming it here keeps the wording pt-BR.
        formatter: '{b}: {c} aluno(s) ({d}%)',
      },
      series: [
        {
          type: 'pie',
          // A ring rather than a full pie: the hole is where the head count goes, so the card
          // answers "how many" and "spread how" in one glance.
          radius: ['58%', '82%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: false,
          label: { show: false },
          labelLine: { show: false },
          itemStyle: {
            borderColor: chartTheme.tooltipBg,
            borderWidth: 2,
          },
          data: data.map((item, index) => ({
            name: item.label,
            value: item.students,
            itemStyle: { color: colorForIndex(chartTheme.seriesColors, index) },
          })),
        },
      ],
      graphic: [
        {
          type: 'text',
          left: 'center',
          top: 'middle',
          style: {
            text: String(total),
            fill: chartTheme.strongTextColor,
            fontSize: theme.typography.h3.fontSize,
            fontFamily: fontFamily.workSans,
            fontWeight: 500,
            letterSpacing: 1,
          },
        },
      ],
    }),
    [theme, chartTheme, data, total],
  );

  return <ReactEchart ref={chartRef} echarts={echarts} option={option} {...rest} />;
};

export default StudentsByClassChart;
