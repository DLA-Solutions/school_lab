import { useRef } from 'react';
import { fontFamily } from 'theme/typography';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import IconifyIcon from 'components/base/IconifyIcon';
import EChartsReactCore from 'echarts-for-react/lib/core';
import VisitorsChartLegends from './VisitorsChartLegends';
import VisitorsChart from './VisitorsChart';
import { websiteVisitorsData } from 'data/visitorsData';

const WebsiteVisitors = () => {
  const chartRef = useRef<EChartsReactCore | null>(null);

  // The header row is pulled down over the chart by `mb={-2}`, so the Export button and the
  // ECharts canvas share space. That overlap is local to this card: the Paper opens the stacking
  // context and the button takes the layer above the canvas inside it, rather than bidding for a
  // named theme layer it would then hold against the whole shell.
  return (
    <Paper sx={{ height: 500, position: 'relative' }}>
      <Stack alignItems="center" justifyContent="space-between" mb={-2}>
        <Typography variant="h6" fontWeight={400} fontFamily={fontFamily.workSans}>
          Website Visitors
        </Typography>
        <Button
          variant="contained"
          color="secondary"
          size="medium"
          endIcon={<IconifyIcon icon="mingcute:arrow-down-line" />}
          sx={{ py: 0.875, zIndex: 1 }}
        >
          Export
        </Button>
      </Stack>

      <VisitorsChart chartRef={chartRef} data={websiteVisitorsData} />
      <VisitorsChartLegends chartRef={chartRef} />
    </Paper>
  );
};

export default WebsiteVisitors;
