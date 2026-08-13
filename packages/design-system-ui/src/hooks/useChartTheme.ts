import { useMemo } from 'react';
import { useTheme } from '@mui/material/styles';
import { useColorScheme } from '@mui/material/styles';
import type { CssVarsTheme, Theme } from '@mui/material/styles';

export interface ChartTheme {
  /** `text.secondary` — tooltip text, and any label ECharts draws alongside the data. */
  textColor: string;
  /**
   * `text.primary` — in-chart text that has to read as strongly as body copy rather than as a
   * label: the value in the middle of a gauge, an annotation on the series itself.
   */
  strongTextColor: string;
  axisColor: string;
  splitLineColor: string;
  seriesColors: string[];
  /**
   * Index-aligned with `seriesColors`: the same series once a legend deselects it. The token set
   * defines a muted counterpart for the three brand colours the dashboard legends toggle; the
   * remaining entries fall back to `text.disabled`, the semantic de-emphasis token.
   */
  mutedSeriesColors: string[];
  tooltipBg: string;
}

const useChartTheme = (): ChartTheme => {
  // `createAppTheme()` sets `cssVariables`, so the theme carries both colour schemes. `useTheme`
  // defaults to the plain `Theme` type, which does not know about them.
  const theme = useTheme<Theme & CssVarsTheme>();
  const { mode, systemMode } = useColorScheme();

  // `systemMode` is only set while `mode` is `'system'`. Anything that is not explicitly light
  // resolves to dark: that is the product default, and also the first render, before
  // `useColorScheme` has read the stored preference.
  const scheme = (systemMode ?? mode) === 'light' ? 'light' : 'dark';

  return useMemo(() => {
    // Under `cssVariables` the live colour lives in a CSS custom property and `theme.palette` is
    // pinned to the default colour scheme. ECharts paints to a canvas, so it can use neither — it
    // needs a resolved value for the scheme currently on screen, which is what
    // `theme.colorSchemes[scheme].palette` holds.
    const palette = theme.colorSchemes[scheme]?.palette ?? theme.palette;
    const secondary = palette.secondary as typeof palette.secondary & {
      lighter?: string;
      darker?: string;
    };

    return {
      textColor: palette.text.secondary,
      strongTextColor: palette.text.primary,
      axisColor: palette.text.secondary,
      splitLineColor: scheme === 'dark' ? palette.grey[700] : palette.grey[200],
      seriesColors: [
        palette.primary.main,
        secondary.lighter ?? secondary.light,
        palette.secondary.main,
        palette.secondary.light,
        palette.success.main,
        palette.warning.main,
      ],
      mutedSeriesColors: [
        palette.primary.dark,
        secondary.darker ?? secondary.dark,
        palette.secondary.dark,
        palette.text.disabled,
        palette.text.disabled,
        palette.text.disabled,
      ],
      tooltipBg: palette.background.paper,
    };
  }, [theme, scheme]);
};

export default useChartTheme;
