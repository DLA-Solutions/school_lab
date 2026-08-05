import { beforeAll, describe, expect, it } from 'vitest';
import { type ColorScheme, renderWithTheme } from 'test/renderWithTheme';
import { AA_TEXT, computedColor, contrastRatio, paletteColor } from 'test/contrast';
import DateSelect from './DateSelect';

const SCHEMES: ColorScheme[] = ['light', 'dark'];

// A picker resolves to its mobile variant when it cannot find a fine pointer, and jsdom reports
// no pointer at all. The dashboard renders the desktop one, which is the variant with the
// calendar button in the field.
beforeAll(() => {
  window.matchMedia = ((query: string) => ({
    matches: query.includes('pointer: fine'),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

describe('DateSelect', () => {
  describe.each(SCHEMES)('%s scheme', (mode) => {
    it('sinks the field into the card on the alternate surface', () => {
      const { container } = renderWithTheme(<DateSelect />, { mode });
      const field = container.querySelector('.MuiPickersInputBase-root')!;

      // This is the assertion the override exists for. The styling used to be a local `sx`
      // reading `theme.palette.surface.alt`, which is pinned to the default colour scheme, so the
      // field painted the light `#F1F5F9` on the dark dashboard card.
      expect(computedColor(field, 'background-color')).toBe(paletteColor('surface.alt'));
    });

    it('reads the selected month and year as secondary text', () => {
      const { container } = renderWithTheme(<DateSelect />, { mode });
      const section = container.querySelector('.MuiPickersSectionList-sectionContent')!;

      // Pairing T06 in `docs/guidelines/web-ui/accessibility.md`: 9.42:1 dark, 6.87:1 light.
      expect(
        contrastRatio(computedColor(section, 'color'), paletteColor('surface.alt')),
      ).toBeGreaterThanOrEqual(AA_TEXT);
    });

    it('keeps the notch off the field in every state', () => {
      const { container } = renderWithTheme(<DateSelect />, { mode });
      const outline = container.querySelector('.MuiPickersOutlinedInput-notchedOutline')!;

      expect(getComputedStyle(outline).borderWidth).toBe('0px');
    });
  });
});
