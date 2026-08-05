import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from '@mui/material/Button';
import { useColorScheme } from '@mui/material/styles';
import { tokens } from '@school-lab/design-tokens';
import { useChartTheme } from 'design-system';
import { renderWithTheme } from 'test/renderWithTheme';

// ECharts paints to a canvas, so every value here has to be a resolved colour for the scheme on
// screen. The token package is the independent reference: if the hook ever falls back to
// `theme.palette` again it pins itself to one scheme and these expectations diverge.
const ChartThemeProbe = () => {
  const chartTheme = useChartTheme();
  const { setMode } = useColorScheme();

  return (
    <div>
      <Button onClick={() => setMode('light')}>Light</Button>
      <Button onClick={() => setMode('dark')}>Dark</Button>
      <p>{`textColor: ${chartTheme.textColor}`}</p>
      <p>{`axisColor: ${chartTheme.axisColor}`}</p>
      <p>{`splitLineColor: ${chartTheme.splitLineColor}`}</p>
      <p>{`tooltipBg: ${chartTheme.tooltipBg}`}</p>
      <p>{`seriesColors: ${chartTheme.seriesColors.join(' ')}`}</p>
    </div>
  );
};

describe('useChartTheme', () => {
  it('resolves the dark scheme the app starts in', () => {
    renderWithTheme(<ChartThemeProbe />);

    expect(screen.getByText(`tooltipBg: ${tokens.dark.background.paper}`)).toBeInTheDocument();
    expect(screen.getByText(`textColor: ${tokens.dark.text.secondary}`)).toBeInTheDocument();
    expect(screen.getByText(`axisColor: ${tokens.dark.text.secondary}`)).toBeInTheDocument();
    expect(screen.getByText(`splitLineColor: ${tokens.dark.grey[700]}`)).toBeInTheDocument();
  });

  it('orders the series colours primary, secondary, success, warning', () => {
    renderWithTheme(<ChartThemeProbe />);

    const { primary, secondary, success, warning } = tokens.dark;
    expect(
      screen.getByText(
        `seriesColors: ${[
          primary.main,
          secondary.lighter,
          secondary.main,
          secondary.light,
          success.main,
          warning.main,
        ].join(' ')}`,
      ),
    ).toBeInTheDocument();
  });

  it('follows the toggle into the light scheme', async () => {
    const user = userEvent.setup();
    renderWithTheme(<ChartThemeProbe />);

    await user.click(screen.getByRole('button', { name: 'Light' }));

    expect(screen.getByText(`tooltipBg: ${tokens.light.background.paper}`)).toBeInTheDocument();
    expect(screen.getByText(`textColor: ${tokens.light.text.secondary}`)).toBeInTheDocument();
    expect(screen.getByText(`splitLineColor: ${tokens.light.grey[200]}`)).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(`^seriesColors: .*${tokens.light.warning.main}$`)),
    ).toBeInTheDocument();
  });

  it('goes back to the dark scheme when the toggle returns', async () => {
    const user = userEvent.setup();
    renderWithTheme(<ChartThemeProbe />);

    await user.click(screen.getByRole('button', { name: 'Light' }));
    await user.click(screen.getByRole('button', { name: 'Dark' }));

    expect(screen.getByText(`tooltipBg: ${tokens.dark.background.paper}`)).toBeInTheDocument();
    expect(screen.getByText(`textColor: ${tokens.dark.text.secondary}`)).toBeInTheDocument();
  });
});
