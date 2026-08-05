import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { tokens } from '@school-lab/design-tokens';
import EChartsReactCore from 'echarts-for-react/lib/core';
import { type ColorScheme, renderWithTheme } from 'test/renderWithTheme';
import { revenueByCustomerData } from 'data/revenueData';
import RevenueChart from './RevenueChart';

vi.mock('components/base/ReactEchart', () => ({
  default: ({ option }: { option: unknown }) => (
    <div data-testid="option">{JSON.stringify(option)}</div>
  ),
}));

interface CapturedOption {
  color: string[];
  series: { name: string }[];
  xAxis: { axisLabel: { color: string } };
}

const captureOption = (mode: ColorScheme): CapturedOption => {
  renderWithTheme(
    <RevenueChart chartRef={createRef<EChartsReactCore>()} data={revenueByCustomerData} />,
    { mode },
  );

  return JSON.parse(screen.getByTestId('option').textContent!) as CapturedOption;
};

describe('RevenueChart', () => {
  it('takes the customer-type colours from the dark palette', () => {
    const { color, series } = captureOption('dark');

    expect(series.map((item) => item.name)).toEqual([
      'Current clients',
      'Subscribers',
      'New customers',
    ]);
    expect(color.slice(0, 3)).toEqual([
      tokens.dark.primary.main,
      tokens.dark.secondary.lighter,
      tokens.dark.secondary.main,
    ]);
  });

  it('takes them from the light palette once the scheme flips', () => {
    const { color, xAxis } = captureOption('light');

    // Subscribers is the series that was wrong: `secondary.lighter` off the pinned palette is
    // always the light #8AADFF, so the dark dashboard drew a pale blue stack.
    expect(color.slice(0, 3)).toEqual([
      tokens.light.primary.main,
      tokens.light.secondary.lighter,
      tokens.light.secondary.main,
    ]);
    expect(xAxis.axisLabel.color).toBe(tokens.light.text.secondary);
  });
});
