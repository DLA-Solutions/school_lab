import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { AA_NON_TEXT, computedColor, contrastRatio, paletteColor } from 'test/contrast';
import { type ColorScheme, renderWithTheme } from 'test/renderWithTheme';
import KPI from './KPI';

const SCHEMES: ColorScheme[] = ['light', 'dark'];

describe('KPI', () => {
  describe.each(SCHEMES)('contrast — %s scheme', (mode) => {
    it('reads the overflow control against the card it sits on', () => {
      renderWithTheme(
        <KPI id={1} icon="solar:bag-bold" title="Enrolments" value="756" rate="3.1%" isUp />,
        { mode },
      );

      // The glyph is the only thing identifying this button, so SC 1.4.11's 3:1 applies. It used
      // to be `neutral.light`, the same #D1DBF9 in both schemes — 1.38:1 on a white card. This
      // pairing was missing from the audit's inventory until 2026-08-04.
      const control = screen.getByRole('button', { name: 'menu' });

      expect(
        contrastRatio(computedColor(control, 'color'), paletteColor('background.paper')),
      ).toBeGreaterThanOrEqual(AA_NON_TEXT);
    });
  });
});
