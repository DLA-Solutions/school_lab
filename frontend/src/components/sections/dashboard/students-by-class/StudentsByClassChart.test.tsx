import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { tokens } from '@school-lab/design-tokens';
import { type ColorScheme, renderWithTheme } from 'test/renderWithTheme';
import StudentsByClassChart from './StudentsByClassChart';

// ECharts needs a canvas, which jsdom has not got, and the option object is the whole contract
// anyway: it is the only thing the chart is handed and every colour in it has already been
// resolved. Capturing it is how a scheme-pinning regression is caught without a browser.
vi.mock('components/base/ReactEchart', () => ({
  default: ({ option }: { option: unknown }) => (
    <div data-testid="option">{JSON.stringify(option)}</div>
  ),
}));

interface CapturedOption {
  series: { data: { name: string; value: number; itemStyle: { color: string } }[] }[];
  graphic: { style: { text: string; fill: string } }[];
  tooltip: { backgroundColor: string; textStyle: { color: string } };
}

const cohorts = [
  { label: '5º ano A', students: 24 },
  { label: '5º ano B', students: 18 },
  { label: 'Sem turma', students: 3 },
];

const captureOption = (mode: ColorScheme, data = cohorts): CapturedOption => {
  renderWithTheme(<StudentsByClassChart data={data} />, { mode });

  return JSON.parse(screen.getByTestId('option').textContent!) as CapturedOption;
};

const colorOf = (option: CapturedOption, name: string) =>
  option.series[0].data.find((item) => item.name === name)!.itemStyle.color;

describe('StudentsByClassChart', () => {
  it('puts the head count in the middle of the ring', () => {
    expect(captureOption('dark').graphic[0].style.text).toBe('45');
  });

  it('paints the centre count in the text colour of the scheme on screen', () => {
    // `text.primary` read off `theme.palette` is the same in both schemes, so a chart that reads
    // it there paints near-black on the dark card.
    expect(captureOption('dark').graphic[0].style.fill).toBe(tokens.dark.text.primary);
  });

  it('paints the centre count in the light text colour once the scheme flips', () => {
    expect(captureOption('light').graphic[0].style.fill).toBe(tokens.light.text.primary);
  });

  it('gives each cohort its own slice colour', () => {
    const option = captureOption('dark');

    expect(colorOf(option, '5º ano A')).toBe(tokens.dark.primary.main);
    expect(colorOf(option, '5º ano B')).toBe(tokens.dark.secondary.lighter);
    expect(colorOf(option, 'Sem turma')).toBe(tokens.dark.secondary.main);
  });

  it('follows the light scheme where the two palettes differ', () => {
    const option = captureOption('light');

    // `secondary.lighter` is the one series colour that actually moves between schemes:
    // #0E43FB dark, #8AADFF light.
    expect(colorOf(option, '5º ano B')).toBe(tokens.light.secondary.lighter);
    expect(tokens.light.secondary.lighter).not.toBe(tokens.dark.secondary.lighter);
    expect(option.tooltip.backgroundColor).toBe(tokens.light.background.paper);
  });

  // A school has more cohorts than the palette has series colours.
  it('cycles the palette rather than running out of colours', () => {
    const many = Array.from({ length: 8 }, (_, index) => ({
      label: `Turma ${index}`,
      students: index + 1,
    }));
    const option = captureOption('dark', many);

    expect(colorOf(option, 'Turma 6')).toBe(colorOf(option, 'Turma 0'));
    expect(colorOf(option, 'Turma 5')).not.toBe(colorOf(option, 'Turma 6'));
  });
});
