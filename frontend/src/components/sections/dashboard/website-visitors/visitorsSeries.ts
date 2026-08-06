/**
 * Where each traffic source sits in `ChartTheme.seriesColors`.
 *
 * The chart paints the bars and the legends repaint them on toggle, so the two have to agree on
 * the colour of a source down to the value. Naming the index once is what makes them agree; the
 * colour itself is resolved for the scheme on screen by `useChartTheme()`.
 */
export const visitorsSeriesIndex: Record<string, number> = {
  Organic: 0,
  Social: 1,
  Direct: 2,
};

/** Sources the data can carry that the mapping above does not name. */
export const FALLBACK_SERIES_INDEX = 3;

export const seriesIndexFor = (type: string): number =>
  visitorsSeriesIndex[type] ?? FALLBACK_SERIES_INDEX;
