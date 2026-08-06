import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import Button from '@mui/material/Button';
import { PageHeader } from 'design-system';
import { renderWithTheme } from 'test/renderWithTheme';

describe('PageHeader', () => {
  it('shows the title as a heading', () => {
    renderWithTheme(<PageHeader title="Students" />);

    expect(screen.getByRole('heading', { name: 'Students' })).toBeInTheDocument();
  });

  it('shows the subtitle when one is given', () => {
    renderWithTheme(<PageHeader title="Students" subtitle="Enrolled in 2026" />);

    expect(screen.getByText('Enrolled in 2026')).toBeInTheDocument();
  });

  it('omits the subtitle when none is given', () => {
    renderWithTheme(<PageHeader title="Students" />);

    expect(screen.queryByText('Enrolled in 2026')).not.toBeInTheDocument();
  });

  it('renders the actions next to the title', () => {
    renderWithTheme(<PageHeader title="Students" actions={<Button>New student</Button>} />);

    expect(screen.getByRole('button', { name: 'New student' })).toBeInTheDocument();
  });
});
