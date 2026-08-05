import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { SemanticChip, SemanticChipVariant } from 'design-system';
import { renderWithTheme } from 'test/renderWithTheme';

describe('SemanticChip', () => {
  const variants: SemanticChipVariant[] = ['success', 'warning', 'error', 'info'];

  it.each(variants)('renders the label for the %s variant', (variant) => {
    renderWithTheme(<SemanticChip variant={variant} label="Paid" />);

    expect(screen.getByText('Paid')).toBeInTheDocument();
  });

  it('applies the requested width', () => {
    const { container } = renderWithTheme(
      <SemanticChip variant="success" label="Delivered" width={80} />,
    );

    expect(container.firstElementChild).toHaveStyle({ width: '80px' });
  });
});
