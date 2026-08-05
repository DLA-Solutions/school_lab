import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { type ColorScheme, renderWithTheme } from 'test/renderWithTheme';
import { AA_TEXT, computedColor, contrastRatio, paletteColor } from 'test/contrast';
import ListItem from './ListItem';

// The item renders a MuiLink, whose themed default component is the react-router Link.
const renderItem = (props: { active?: boolean; path?: string }, mode: ColorScheme = 'dark') =>
  renderWithTheme(
    <MemoryRouter>
      <ListItem id="dashboard" subheader="Dashboard" path="/" {...props} />
    </MemoryRouter>,
    { mode },
  );

const labelIn = (root: ParentNode) => root.querySelector('.MuiListItemText-primary')!;

const label = () => labelIn(document);

const SCHEMES: ColorScheme[] = ['light', 'dark'];

describe('sidebar ListItem', () => {
  it('marks the active destination as the current page', () => {
    renderItem({ active: true });

    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
  });

  it('leaves aria-current off every other destination', () => {
    renderItem({ active: false });

    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current');
  });

  describe.each(SCHEMES)('contrast — %s scheme', (mode) => {
    it('reads the label of a destination the user is not on', () => {
      renderItem({ active: false }, mode);

      // This used to be `opacity: 0.3` on the whole button — 1.93:1 in dark, 1.59:1 in light, the
      // worst text result in the audit, on the navigation every page load starts from.
      expect(
        contrastRatio(computedColor(label(), 'color'), paletteColor('background.default')),
      ).toBeGreaterThanOrEqual(AA_TEXT);
    });

    it('reads the label of the destination the user is on', () => {
      renderItem({ active: true }, mode);

      expect(
        contrastRatio(computedColor(label(), 'color'), paletteColor('background.default')),
      ).toBeGreaterThanOrEqual(AA_TEXT);
    });

    it('leaves the button at full opacity so the focus ring is not dimmed with it', () => {
      renderItem({ active: false }, mode);

      // Opacity composites the outline too, so the blanket dimming took the focus ring on this
      // control down to 1.45:1 — below the 3:1 that SC 1.4.11 asks of it.
      const opacity = getComputedStyle(screen.getByRole('link', { name: 'Dashboard' })).opacity;

      expect(opacity === '' ? 1 : Number(opacity)).toBe(1);
    });

    it('keeps the active and inactive labels visibly apart', () => {
      const inactive = renderItem({ active: false }, mode);
      const inactiveColor = computedColor(labelIn(inactive.container), 'color');

      const active = renderItem({ active: true }, mode);
      const activeColor = computedColor(labelIn(active.container), 'color');

      // Removing the dimming removed the only thing that distinguished the two states, so the
      // active item is promoted to `text.primary` (or the brand purple on the dashboard root in
      // dark) rather than sharing `text.secondary` with everything else.
      expect(activeColor).not.toBe(inactiveColor);
    });
  });
});
