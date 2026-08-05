import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeToggle } from 'design-system';
import { renderWithTheme } from 'test/renderWithTheme';

describe('ThemeToggle', () => {
  it('names the button after the scheme it switches to', () => {
    renderWithTheme(<ThemeToggle />);

    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument();
  });

  it('names the button for the light scheme too', () => {
    renderWithTheme(<ThemeToggle />, { mode: 'light' });

    expect(screen.getByRole('button', { name: 'Switch to dark mode' })).toBeInTheDocument();
  });

  it('lets the caller supply both labels', () => {
    renderWithTheme(
      <ThemeToggle switchToLightLabel="Light theme" switchToDarkLabel="Dark theme" />,
    );

    expect(screen.getByRole('button', { name: 'Light theme' })).toBeInTheDocument();
  });

  it('switches the scheme when pressed', async () => {
    const user = userEvent.setup();
    renderWithTheme(<ThemeToggle />);

    await user.click(screen.getByRole('button', { name: 'Switch to light mode' }));

    expect(screen.getByRole('button', { name: 'Switch to dark mode' })).toBeInTheDocument();
  });
});
