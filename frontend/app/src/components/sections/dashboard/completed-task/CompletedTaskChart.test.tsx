import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { tokens } from '@school-lab/design-tokens';
import { type ColorScheme, renderWithTheme } from 'test/renderWithTheme';
import CompletedTaskChart from './CompletedTaskChart';

vi.mock('components/base/ReactEchart', () => ({
  default: ({ option }: { option: unknown }) => (
    <div data-testid="option">{JSON.stringify(option)}</div>
  ),
}));

interface CapturedOption {
  series: {
    lineStyle: { color: string };
    areaStyle: { color: { colorStops: { color: string }[] } };
  }[];
  tooltip: { backgroundColor: string };
}

const monthlyIncome = [
  { date: 'Jan', value: 12_000 },
  { date: 'Fev', value: 9_500 },
  { date: 'Mar', value: 15_200 },
];

const captureOption = (mode: ColorScheme): CapturedOption => {
  renderWithTheme(<CompletedTaskChart data={monthlyIncome} />, { mode });

  return JSON.parse(screen.getByTestId('option').textContent!) as CapturedOption;
};

describe('CompletedTaskChart', () => {
  it('draws the line and its fade in the same series colour', () => {
    const { series } = captureOption('dark');

    expect(series[0].lineStyle.color).toBe(tokens.dark.secondary.main);
    expect(series[0].areaStyle.color.colorStops.map((stop) => stop.color)).toEqual([
      `${tokens.dark.secondary.main}33`,
      `${tokens.dark.secondary.main}00`,
    ]);
  });

  it('follows the scheme for the values that move', () => {
    const option = captureOption('light');

    // `secondary.main` is the same cyan in both schemes, so this chart never showed the bug —
    // the tooltip surface is what proves the option is resolved for the scheme on screen.
    expect(option.series[0].lineStyle.color).toBe(tokens.light.secondary.main);
    expect(option.tooltip.backgroundColor).toBe(tokens.light.background.paper);
  });
});
