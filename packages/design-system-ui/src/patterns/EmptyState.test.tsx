import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { EmptyState } from 'design-system';
import { renderWithTheme } from 'test/renderWithTheme';

describe('EmptyState', () => {
  it('shows the title and the description', () => {
    renderWithTheme(<EmptyState title="No students yet" description="Enrol one to start." />);

    expect(screen.getByText('No students yet')).toBeInTheDocument();
    expect(screen.getByText('Enrol one to start.')).toBeInTheDocument();
  });

  it('stacks the title and description in a column', () => {
    const { container } = renderWithTheme(
      <EmptyState title="No students yet" description="Enrol one to start." />,
    );

    const stacks = container.querySelectorAll('.MuiStack-root');
    expect(stacks.length).toBeGreaterThanOrEqual(2);
    stacks.forEach((stack) => {
      expect(stack).toHaveStyle({ flexDirection: 'column' });
    });
  });

  it('does not render a decorative tile unless the caller passed an icon', () => {
    const { container } = renderWithTheme(<EmptyState title="No students yet" />);

    expect(screen.queryByText('∅')).not.toBeInTheDocument();
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeInTheDocument();
  });

  it('renders a caller-supplied icon, still hidden from assistive technology', () => {
    renderWithTheme(<EmptyState title="No students yet" icon={<span>+</span>} />);

    expect(screen.getByText('+').closest('[aria-hidden="true"]')).toBeInTheDocument();
  });

  it('leaves the title out of the document outline by default', () => {
    renderWithTheme(<EmptyState title="No students yet" />);

    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('announces the title as a heading at the level the caller asks for', () => {
    renderWithTheme(<EmptyState title="No students yet" headingLevel={2} />);

    expect(screen.getByRole('heading', { name: 'No students yet', level: 2 })).toBeInTheDocument();
  });
});
