import { describe, expect, it } from 'vitest';
import Checkbox from '@mui/material/Checkbox';
import { renderWithTheme } from 'test/renderWithTheme';
import CheckboxBlankIcon from './CheckboxBlankIcon';

describe('CheckboxBlankIcon', () => {
  it('paints the box from the theme rather than from SVG attributes', () => {
    const { container } = renderWithTheme(<CheckboxBlankIcon />);
    const rect = container.querySelector('rect');

    // The box used to carry `fill="#0B1739" stroke="#7E89AC"`, which pinned the unchecked
    // checkbox to the dark scheme's surface and left it unreadable on a light card.
    expect(rect).not.toHaveAttribute('fill');
    expect(rect).not.toHaveAttribute('stroke');
    expect(container.querySelector('svg')?.getAttribute('class')).toMatch(/css-/);
  });

  it('is what an unchecked Checkbox renders', () => {
    const { container } = renderWithTheme(<Checkbox inputProps={{ 'aria-label': 'Active' }} />);

    expect(container.querySelector('svg rect')).toBeInTheDocument();
    expect(container.querySelector('svg path')).not.toBeInTheDocument();
  });
});
