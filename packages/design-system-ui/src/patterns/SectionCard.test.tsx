import { describe, expect, it } from 'vitest';
import Typography from '@mui/material/Typography';
import { SectionCard } from 'design-system';
import { renderWithTheme } from 'test/renderWithTheme';

describe('SectionCard', () => {
  it('removes Paper padding when padding is 0', () => {
    const { container } = renderWithTheme(
      <SectionCard padding={0}>
        <Typography>Body</Typography>
      </SectionCard>,
    );

    expect(container.firstChild).toHaveStyle({ padding: '0px' });
  });

  it('applies theme spacing when padding is a non-zero value', () => {
    const { container: flushContainer } = renderWithTheme(
      <SectionCard padding={0}>
        <Typography>Body</Typography>
      </SectionCard>,
    );
    const { container: paddedContainer } = renderWithTheme(
      <SectionCard padding={2}>
        <Typography>Body</Typography>
      </SectionCard>,
    );

    const flushPaper = flushContainer.firstElementChild as HTMLElement;
    const paddedPaper = paddedContainer.firstElementChild as HTMLElement;

    expect(flushPaper).toHaveStyle({ padding: '0px' });
    expect(window.getComputedStyle(paddedPaper).paddingTop).not.toBe('0px');
  });

  it('shows the title as a heading', () => {
    const { getByRole } = renderWithTheme(
      <SectionCard title="Revenue overview">
        <Typography>Body</Typography>
      </SectionCard>,
    );

    expect(getByRole('heading', { name: 'Revenue overview' })).toBeInTheDocument();
  });
});
