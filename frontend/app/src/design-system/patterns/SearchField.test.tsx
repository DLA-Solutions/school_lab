import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { SearchField } from 'design-system';
import { renderWithTheme } from 'test/renderWithTheme';

describe('SearchField', () => {
  const noop = () => {};

  it('exposes a default accessible name, which the placeholder alone does not provide', () => {
    renderWithTheme(<SearchField value="" onChange={noop} />);

    expect(screen.getByRole('textbox', { name: 'Search' })).toBeInTheDocument();
  });

  it('lets the caller name the field', () => {
    renderWithTheme(<SearchField value="" onChange={noop} ariaLabel="Search students" />);

    expect(screen.getByRole('textbox', { name: 'Search students' })).toBeInTheDocument();
  });

  it('keeps the accessible name once the placeholder is gone', () => {
    renderWithTheme(<SearchField value="Ana" onChange={noop} />);

    expect(screen.getByRole('textbox', { name: 'Search' })).toHaveValue('Ana');
  });
});
