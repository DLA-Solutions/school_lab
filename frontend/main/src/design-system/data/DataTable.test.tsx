import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { DataTable } from 'design-system';
import { renderWithTheme } from 'test/renderWithTheme';

const columns = [{ field: 'name', headerName: 'Name', flex: 1 }];

const rows = [
  { id: 1, name: 'Ana' },
  { id: 2, name: 'Bruno' },
  { id: 3, name: 'Carla' },
];

describe('DataTable', () => {
  it('prints the row range in the footer', () => {
    renderWithTheme(<DataTable rows={rows} columns={columns} autoHeight />);

    expect(screen.getByText('1-3 of 3')).toBeInTheDocument();
  });

  it('lets the caller phrase the row range', () => {
    renderWithTheme(
      <DataTable
        rows={rows}
        columns={columns}
        autoHeight
        rangeLabel={({ from, to, count }) => `Showing ${from} to ${to} of ${count} students`}
      />,
    );

    expect(screen.getByText('Showing 1 to 3 of 3 students')).toBeInTheDocument();
  });
});
