import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { AA_TEXT, computedColor, contrastRatio, paletteColor } from 'test/contrast';
import { type ColorScheme, renderWithTheme } from 'test/renderWithTheme';
import ConversationRow from './ConversationRow';

const SCHEMES: ColorScheme[] = ['light', 'dark'];

describe('ConversationRow', () => {
  describe.each(SCHEMES)('%s scheme', (mode) => {
    it('reads the unselected name against the row surface', () => {
      renderWithTheme(
        <>
          <ConversationRow label="Ana Barbosa" detail="1º ano" selected={false} onClick={() => {}} />
          <ConversationRow label="Beatriz Barbosa" selected onClick={() => {}} />
        </>,
        { mode },
      );

      const unselected = screen.getByRole('button', { name: 'Ana Barbosa' });
      const selected = screen.getByRole('button', { name: 'Beatriz Barbosa' });
      const name = screen.getByText('Ana Barbosa');
      const detail = screen.getByText('1º ano');

      expect(getComputedStyle(unselected).appearance).toBe('none');
      expect(computedColor(unselected, 'background-color')).toBe(paletteColor('background.paper'));
      expect(computedColor(name, 'color')).toBe(paletteColor('text.primary'));
      expect(computedColor(detail, 'color')).toBe(paletteColor('text.secondary'));
      expect(
        contrastRatio(computedColor(name, 'color'), computedColor(unselected, 'background-color')),
      ).toBeGreaterThanOrEqual(AA_TEXT);

      expect(computedColor(selected, 'background-color')).toBe(paletteColor('background.default'));
      expect(
        contrastRatio(
          computedColor(screen.getByText('Beatriz Barbosa'), 'color'),
          computedColor(selected, 'background-color'),
        ),
      ).toBeGreaterThanOrEqual(AA_TEXT);
      expect(selected).toHaveAttribute('aria-current', 'true');
      expect(unselected).not.toHaveAttribute('aria-current');
    });
  });
});
