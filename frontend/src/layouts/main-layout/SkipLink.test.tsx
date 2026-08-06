import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithTheme } from 'test/renderWithTheme';
import SkipLink from './SkipLink';

const renderLink = () =>
  renderWithTheme(
    <>
      <SkipLink targetId="main-content">Skip to main content</SkipLink>
      <main id="main-content" tabIndex={-1}>
        Page body
      </main>
    </>,
  );

const link = () => screen.getByRole('link', { name: 'Skip to main content' });

describe('SkipLink', () => {
  it('points at the region it is asked to skip to', () => {
    renderLink();

    expect(link()).toHaveAttribute('href', '#main-content');
  });

  it('takes up no space in the shell', () => {
    renderLink();

    // `visuallyHidden` clips the link to a pixel while leaving it in the accessibility tree.
    // Hiding it with `display: none` or a zero size instead would drop it from that tree and
    // from the tab order, which is the whole of what a skip link is for. The focused appearance
    // is a `:focus` rule, which jsdom does not apply to a computed style — the spec below
    // asserts the half of the contract it can see, that focus reaches the link at all.
    const styles = getComputedStyle(link());
    expect(styles.position).toBe('absolute');
    expect(styles.width).toBe('1px');
    expect(styles.height).toBe('1px');
    expect(styles.overflow).toBe('hidden');
  });

  it('is the first thing a keyboard user reaches', async () => {
    const user = userEvent.setup();
    renderLink();

    await user.tab();

    expect(link()).toHaveFocus();
  });
});
