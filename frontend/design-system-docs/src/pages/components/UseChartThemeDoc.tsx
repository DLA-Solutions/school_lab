import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useChartTheme } from 'design-system';
import { DocSection } from '../../components/DocLayout';
import CodeBlock from '../../components/CodeBlock';
import LivePreview from '../../components/LivePreview';
import SpecTable from '../../components/SpecTable';

const shape = [
  [
    <code key="k">textColor</code>,
    <code key="t">string</code>,
    <code key="s">text.secondary</code>,
    'Tooltip text, legend text, any label ECharts draws',
  ],
  [
    <code key="k">axisColor</code>,
    <code key="t">string</code>,
    <code key="s">text.secondary</code>,
    'Axis lines and tick labels',
  ],
  [
    <code key="k">splitLineColor</code>,
    <code key="t">string</code>,
    <code key="s">grey[700]</code>,
    'Grid lines behind the series — grey[200] in the light scheme',
  ],
  [
    <code key="k">seriesColors</code>,
    <code key="t">string[]</code>,
    'Six palette entries',
    'Series colours in order: primary, secondary lighter / main / light, success, warning',
  ],
  [
    <code key="k">tooltipBg</code>,
    <code key="t">string</code>,
    <code key="s">background.paper</code>,
    'Tooltip surface, so it reads as a card over the chart',
  ],
];

const Swatch = ({ label, color }: { label: string; color: string }) => (
  <Stack direction="column" spacing={0.5} alignItems="center">
    <Box
      sx={{
        width: 56,
        height: 40,
        borderRadius: 1,
        bgcolor: color,
        border: 1,
        borderColor: 'divider',
      }}
    />
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
  </Stack>
);

const Resolved = () => {
  const chartTheme = useChartTheme();

  return (
    <Stack direction="column" spacing={3}>
      <Stack direction="row" spacing={2} flexWrap="wrap">
        <Swatch label="textColor" color={chartTheme.textColor} />
        <Swatch label="axisColor" color={chartTheme.axisColor} />
        <Swatch label="splitLineColor" color={chartTheme.splitLineColor} />
        <Swatch label="tooltipBg" color={chartTheme.tooltipBg} />
      </Stack>
      <Stack direction="column" spacing={1}>
        <Typography variant="caption" color="text.secondary">
          seriesColors
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          {chartTheme.seriesColors.map((color, index) => (
            <Swatch key={color + index} label={`[${index}]`} color={color} />
          ))}
        </Stack>
      </Stack>
    </Stack>
  );
};

const UseChartThemeDoc = () => (
  <DocSection
    id="use-chart-theme"
    title="useChartTheme"
    description="The bridge between the MUI theme and ECharts, which knows nothing about either."
  >
    <Typography variant="body1" paragraph>
      Charts are the one surface the theme cannot reach on its own. ECharts renders to a canvas from
      a plain option object, so there is no element for a component override to style and no CSS
      variable for it to read. <code>useChartTheme()</code> closes that gap: it resolves the palette
      for the active colour scheme and hands back the handful of values a chart option actually
      needs.
    </Typography>
    <Typography variant="body1" paragraph>
      It is a hook rather than a constant because it depends on <code>useColorScheme()</code>: when
      the user flips the theme toggle the returned object is rebuilt and the memoised option is
      recomputed.
    </Typography>

    <Typography variant="h6" gutterBottom>
      The ChartTheme shape
    </Typography>
    <Typography variant="body2" color="text.secondary" mb={2}>
      Every value is a resolved colour taken from the palette of the scheme currently on screen.
    </Typography>
    <SpecTable headers={['Key', 'Type', 'Resolves from', 'Used for']} rows={shape} />

    <Typography variant="h6" gutterBottom>
      Resolved in the current scheme
    </Typography>
    <Typography variant="body2" color="text.secondary" mb={2}>
      These swatches are the live return value. Toggle the theme in the header and every one of
      them moves, except <code>seriesColors[0]</code>, <code>[2]</code> and <code>[3]</code> and{' '}
      <code>splitLineColor</code> — those tokens hold the same value in both schemes.
    </Typography>
    <LivePreview>
      <Resolved />
    </LivePreview>

    <Typography variant="h6" gutterBottom>
      How it resolves the scheme
    </Typography>
    <Typography variant="body2" color="text.secondary" mb={2}>
      Everywhere else in the theme, a per-scheme colour is read through{' '}
      <code>(theme.vars || theme).palette</code>, which yields a CSS custom property that the
      browser re-resolves when the scheme class changes. A canvas cannot use one: ECharts is handed
      a plain option object and paints pixels from it, so it needs a real colour value.
    </Typography>
    <Typography variant="body2" color="text.secondary" mb={2}>
      <code>theme.palette</code> is not that value either. Under <code>cssVariables</code> it is
      pinned to the default colour scheme, so reading it hands a chart light-scheme colours while
      the dashboard is dark. The hook instead takes the reactive <code>mode</code> from{' '}
      <code>useColorScheme()</code> and reads{' '}
      <code>theme.colorSchemes[mode].palette</code>, which carries fully resolved values for both
      schemes.
    </Typography>
    <CodeBlock
      code={`const theme = useTheme<Theme & CssVarsTheme>();
const { mode, systemMode } = useColorScheme();
const scheme = (systemMode ?? mode) === 'light' ? 'light' : 'dark';

const palette = theme.colorSchemes[scheme]?.palette ?? theme.palette;`}
    />
    <Typography variant="body2" color="text.secondary" mb={2}>
      Anything not explicitly light resolves to dark: that is the product default, and also the
      first render, before <code>useColorScheme()</code> has read the stored preference.
    </Typography>

    <Typography variant="h6" gutterBottom>
      Using it
    </Typography>
    <Typography variant="body2" color="text.secondary" mb={2}>
      Build the option inside <code>useMemo</code> with the chart theme in the dependency array,
      then hand it to <code>ReactEchart</code>. Without the memo the option is a new object on every
      render and ECharts re-initialises the chart each time.
    </Typography>
    <CodeBlock
      code={`import { useMemo } from 'react';
import { useChartTheme } from 'design-system';
import ReactEchart from 'components/base/ReactEchart';

const EnrolmentsChart = ({ data }: { data: Point[] }) => {
  const chartTheme = useChartTheme();

  const option = useMemo(
    () => ({
      color: chartTheme.seriesColors,
      tooltip: {
        backgroundColor: chartTheme.tooltipBg,
        textStyle: { color: chartTheme.textColor },
      },
      xAxis: {
        type: 'category',
        data: data.map((point) => point.label),
        axisLine: { lineStyle: { color: chartTheme.axisColor } },
        axisLabel: { color: chartTheme.textColor },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: chartTheme.splitLineColor } },
        axisLabel: { color: chartTheme.textColor },
      },
      series: [{ type: 'bar', data: data.map((point) => point.value) }],
    }),
    [chartTheme, data],
  );

  return <ReactEchart echarts={echarts} option={option} />;
};`}
    />
    <Typography variant="body2" color="text.secondary" mb={2}>
      Setting <code>color</code> at the top of the option applies <code>seriesColors</code> in
      order across every series, which is what you want when the number of series is not fixed. Pick
      individual entries only when a specific series has a meaning attached to its colour — the
      dashboard&apos;s visitor chart maps each traffic source to a palette entry that way.
    </Typography>

    <Typography variant="h6" gutterBottom>
      When to use
    </Typography>
    <ul>
      <li>
        <Typography variant="body2">
          Any ECharts option in the SPA — axis, grid, tooltip and series colour all come from here.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          A canvas or SVG visualisation outside MUI that still has to match the product surface.
        </Typography>
      </li>
    </ul>

    <Typography variant="h6" gutterBottom>
      When not to use
    </Typography>
    <ul>
      <li>
        <Typography variant="body2">
          Styling React elements. Use <code>sx</code> with palette paths; those resolve through CSS
          variables and do not need a hook.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Reading a colour the shape does not expose. Take it from{' '}
          <code>theme.colorSchemes[mode].palette</code> alongside the chart theme, rather than
          widening <code>ChartTheme</code> for one screen.
        </Typography>
      </li>
    </ul>

    <Typography variant="h6" gutterBottom>
      Don&apos;t
    </Typography>
    <ul>
      <li>
        <Typography variant="body2">
          Hardcode a hex in a chart option. It is the easiest place in the codebase to smuggle one
          in, and it will be wrong in one of the two schemes.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Read <code>theme.palette</code> in a chart option, or <code>theme.palette.mode</code> to
          branch on the scheme. Both are pinned to the default scheme under{' '}
          <code>cssVariables</code>, so the chart is silently wrong in the other one.{' '}
          <code>useColorScheme().mode</code> is the reactive one.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Build the option outside <code>useMemo</code>, or leave <code>chartTheme</code> out of the
          dependencies — the chart then keeps the colours of whichever scheme it first rendered in.
        </Typography>
      </li>
    </ul>
  </DocSection>
);

export default UseChartThemeDoc;
