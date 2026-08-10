import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import { PageHeader, SearchField } from 'design-system';
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

  // Labels stack above the field in this theme (`MuiInputLabel` is `position: static`), so a
  // labelled select is taller than a bare search box by exactly its label. Centring them left the
  // two input boxes sitting at different heights across the register screens; lining up the
  // bottom edges puts the boxes on one line and leaves the labels above them.
  it('lines its actions up on their bottom edge, not their middle', () => {
    renderWithTheme(
      <PageHeader
        title="Students"
        actions={
          <>
            <TextField id="situation" label="Situação" size="small" variant="filled" value="" />
            <SearchField value="" onChange={() => {}} ariaLabel="Buscar estudantes" />
          </>
        }
      />,
    );

    // The row holding the actions is the parent of the fields themselves.
    const row = screen
      .getByRole('textbox', { name: 'Buscar estudantes' })
      .closest('.MuiFormControl-root')?.parentElement as HTMLElement;

    expect(getComputedStyle(row).alignItems).toBe('flex-end');
  });
});
