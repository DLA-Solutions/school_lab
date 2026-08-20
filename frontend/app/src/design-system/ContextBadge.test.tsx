import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { ContextBadge, ContextBadgeVariant } from 'design-system';
import { renderWithTheme } from 'test/renderWithTheme';

describe('ContextBadge', () => {
  const variants: ContextBadgeVariant[] = ['platform', 'staff', 'teacher', 'guardian'];

  it.each(variants)('renders the label for the %s variant', (variant) => {
    renderWithTheme(<ContextBadge variant={variant} label="Secretaria" />);

    expect(screen.getByText('Secretaria')).toBeInTheDocument();
  });

  it('renders the secondary label when provided', () => {
    renderWithTheme(
      <ContextBadge variant="staff" label="Secretaria" secondaryLabel="Escola Modelo" />,
    );

    expect(screen.getByText('Escola Modelo')).toBeInTheDocument();
  });

  it('renders role and school on one line in compact mode', () => {
    renderWithTheme(
      <ContextBadge
        variant="staff"
        label="Secretaria"
        secondaryLabel="Escola Modelo"
        compact
      />,
    );

    expect(screen.getByText('Secretaria · Escola Modelo')).toBeInTheDocument();
  });

  it('calls onClick when the badge is interactive', () => {
    const onClick = vi.fn();

    renderWithTheme(
      <ContextBadge variant="guardian" label="Responsável" onClick={onClick} tooltip="Trocar perfil" />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Trocar perfil' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
