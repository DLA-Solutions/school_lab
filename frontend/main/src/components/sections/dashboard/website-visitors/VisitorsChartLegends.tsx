import { useState, useEffect } from 'react';
import Stack from '@mui/material/Stack';
import useChartTheme from 'design-system/hooks/useChartTheme';
import VisitorsChartLegend from './VisitorsChartLegend';
import EChartsReactCore from 'echarts-for-react/lib/core';
import { visitorsChartLegendsData } from 'data/legendsData';
import { seriesIndexFor } from './visitorsSeries';

interface LegendsProps {
  chartRef: React.RefObject<EChartsReactCore | null>;
}

const VisitorsChartLegends = ({ chartRef }: LegendsProps) => {
  // This writes colours straight back into the chart's option, so they have to be resolved for
  // the scheme on screen exactly as `VisitorsChart` resolved them in the first place.
  const chartTheme = useChartTheme();
  const [toggleColor, setToggleColor] = useState({
    organic: true,
    social: true,
    direct: true,
  });

  const getActiveColor = (type: string) => chartTheme.seriesColors[seriesIndexFor(type)];

  const getDisableColor = (type: string) => chartTheme.mutedSeriesColors[seriesIndexFor(type)];

  const handleToggleLegend = (e: React.MouseEvent, type: string | null) => {
    e.stopPropagation();
    const echartsInstance = chartRef.current?.getEchartsInstance();
    if (!echartsInstance) return;

    const option = echartsInstance.getOption() as echarts.EChartsOption;

    if (type === 'Organic') {
      setToggleColor({ organic: true, social: false, direct: false });
    } else if (type === 'Social') {
      setToggleColor({ organic: false, social: true, direct: false });
    } else if (type === 'Direct') {
      setToggleColor({ organic: false, social: false, direct: true });
    } else {
      setToggleColor({ organic: true, social: true, direct: true });
    }

    if (Array.isArray(option.series)) {
      const series = option.series.map((s) => {
        if (Array.isArray(s.data)) {
          s.data.forEach((item) => {
            if (type !== null && item.itemStyle && item.itemStyle.color) {
              if (type === item.type) {
                item.itemStyle.color = getActiveColor(item.type);
              } else {
                item.itemStyle.color = getDisableColor(item.type);
              }
            } else {
              item.itemStyle.color = getActiveColor(item.type);
            }
          });
        }
        return s;
      });

      echartsInstance.setOption({ series });
    }
  };

  useEffect(() => {
    const handleBodyClick = (e: MouseEvent) => {
      handleToggleLegend(e as unknown as React.MouseEvent, null);
    };
    document.body.addEventListener('click', handleBodyClick);
    return () => {
      document.body.removeEventListener('click', handleBodyClick);
    };
  });

  return (
    <Stack mt={-1} spacing={3} direction="column">
      {visitorsChartLegendsData.map((item) => (
        <VisitorsChartLegend
          key={item.id}
          data={item}
          toggleColor={toggleColor}
          handleToggleLegend={handleToggleLegend}
        />
      ))}
    </Stack>
  );
};

export default VisitorsChartLegends;
