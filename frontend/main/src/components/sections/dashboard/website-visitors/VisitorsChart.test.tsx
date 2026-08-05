import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { tokens } from '@school-lab/design-tokens';
import EChartsReactCore from 'echarts-for-react/lib/core';
import { type ColorScheme, renderWithTheme } from 'test/renderWithTheme';
import { websiteVisitorsData } from 'data/visitorsData';
import VisitorsChart from './VisitorsChart';

// ECharts needs a canvas, which jsdom has not got, and the option object is the whole contract
// anyway: it is the only thing the chart is handed and every colour in it has already been
// resolved. Capturing it is how a scheme-pinning regression is caught without a browser.
vi.mock('components/base/ReactEchart', () => ({
  default: ({ option }: { option: unknown }) => (
    <div data-testid="option">{JSON.stringify(option)}</div>
  ),
}));

interface CapturedOption {
  series: { data: { type: string; itemStyle: { color: string } }[] }[];
  graphic: { style: { fill: string } }[];
  tooltip: { backgroundColor: string; textStyle: { color: string } };
}

const captureOption = (mode: ColorScheme): CapturedOption => {
  renderWithTheme(<VisitorsChart chartRef={createRef<EChartsReactCore>()} data={websiteVisitorsData} />, {
    mode,
  });

  return JSON.parse(screen.getByTestId('option').textContent!) as CapturedOption;
};

const colorOf = (option: CapturedOption, type: string) =>
  option.series[0].data.find((item) => item.type === type)!.itemStyle.color;

describe('VisitorsChart', () => {
  it('paints the centre label in the text colour of the scheme on screen', () => {
    // The visible half of the bug this spec exists for: `text.primary` read off `theme.palette`
    // is `#171923` in both schemes, so "150k" used to paint near-black on the dark card.
    expect(captureOption('dark').graphic[0].style.fill).toBe(tokens.dark.text.primary);
  });

  it('paints the centre label in the light text colour once the scheme flips', () => {
    expect(captureOption('light').graphic[0].style.fill).toBe(tokens.light.text.primary);
  });

  it('gives each traffic source its brand colour in the dark scheme', () => {
    const option = captureOption('dark');

    expect(colorOf(option, 'Organic')).toBe(tokens.dark.primary.main);
    expect(colorOf(option, 'Social')).toBe(tokens.dark.secondary.lighter);
    expect(colorOf(option, 'Direct')).toBe(tokens.dark.secondary.main);
  });

  it('follows the light scheme where the two palettes differ', () => {
    const option = captureOption('light');

    // `secondary.lighter` is the one series colour that actually moves between schemes:
    // #0E43FB dark, #8AADFF light. Reading it off the pinned palette handed the dashboard the
    // light value while it was dark.
    expect(colorOf(option, 'Social')).toBe(tokens.light.secondary.lighter);
    expect(tokens.light.secondary.lighter).not.toBe(tokens.dark.secondary.lighter);
    expect(option.tooltip.backgroundColor).toBe(tokens.light.background.paper);
  });
});
