import { describe, expect, it } from 'vitest';
import Button from './components/button/Button';
import { createAppTheme } from './createAppTheme';

/**
 * The destructive confirm button keeps its fill through every state.
 *
 * MUI's default hover swaps in `error.dark`, which is derived from `main` rather than chosen. In
 * the dark scheme that is #B23E46: it takes the near-black label from 5.75:1 down to 3.11:1 and
 * pulls the red towards the dialog's own #0B1739, so the button reads as having vanished under
 * the cursor. Asserted on the override itself, since jsdom has no pointer to hover with.
 */
describe('the destructive confirm button', () => {
  const overrides = Button!.styleOverrides! as Record<
    string,
    (arg: { theme: unknown }) => Record<string, unknown>
  >;

  const containedError = () => overrides.containedError({ theme: createAppTheme() });

  it('declares the same fill at rest, on hover, while pressed and when focused', () => {
    const style = containedError();
    const resting = style.backgroundColor;

    expect(resting).toBeTruthy();
    ['&:hover', '&:active', '&.Mui-focusVisible'].forEach((state) => {
      expect((style[state] as Record<string, unknown>).backgroundColor).toBe(resting);
    });
  });

  // Feedback that costs no contrast, so the button still answers the cursor.
  it('answers hover and focus with a halo rather than a different colour', () => {
    const style = containedError();

    expect(style['&:hover, &.Mui-focusVisible']).toMatchObject({
      boxShadow: expect.stringContaining('0 0 0 4px'),
    });
  });

  // The label is the other half of the measurement; it moves per scheme, the fill does not.
  it('keeps the fill off `error.dark`, which is what MUI would have used', () => {
    const theme = createAppTheme() as unknown as {
      colorSchemes: { dark: { palette: { error: { dark: string } } } };
    };
    const style = containedError();

    expect(String(style.backgroundColor)).not.toContain(theme.colorSchemes.dark.palette.error.dark);
    expect(String(style.backgroundColor)).toContain('error');
  });
});
