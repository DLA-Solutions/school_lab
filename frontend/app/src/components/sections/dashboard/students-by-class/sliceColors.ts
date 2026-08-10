/**
 * A school has more cohorts than the palette has series colours, so the ring cycles through them.
 * Neighbouring slices still differ, which is what the reading depends on; two classes far apart in
 * the ring sharing a colour is told apart by the legend beside it.
 *
 * The chart paints the slices and the legend paints its dots, so the two have to agree on a
 * cohort's colour down to the value. Deriving it from the index in one place is what makes them
 * agree; the colour itself is resolved for the scheme on screen by `useChartTheme()`.
 */
export const colorForIndex = (seriesColors: string[], index: number) =>
  seriesColors[index % seriesColors.length];
