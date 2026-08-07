import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { BrandLogo } from 'design-system';
import { renderWithTheme } from 'test/renderWithTheme';

describe('BrandLogo', () => {
  it('exposes the brand name once for the mark variant', () => {
    renderWithTheme(<BrandLogo />);

    expect(screen.getByAltText('Scholar Premium')).toBeInTheDocument();
  });

  it('lets the caller override the accessible name', () => {
    renderWithTheme(<BrandLogo alt="Scholar Premium home" variant="lockup" height={32} />);

    expect(screen.getByAltText('Scholar Premium home')).toBeInTheDocument();
  });
});
