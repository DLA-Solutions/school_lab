import { DataTable } from 'design-system';
import { GridColDef } from '@mui/x-data-grid';

const columns: GridColDef[] = [
  { field: 'id', headerName: 'ID', width: 90 },
  { field: 'name', headerName: 'Name', flex: 1 },
  { field: 'status', headerName: 'Status', width: 120 },
];

const rows = [
  { id: 1, name: 'Alice', status: 'active' },
  { id: 2, name: 'Bob', status: 'pending' },
  { id: 3, name: 'Carol', status: 'active' },
];

export const Default = () => (
  <DataTable
    rows={rows}
    columns={columns}
    autoHeight
    initialState={{ pagination: { paginationModel: { pageSize: 5 } } }}
    pageSizeOptions={[5]}
    checkboxSelection
  />
);

export const CustomRangeLabel = () => (
  <DataTable
    rows={rows}
    columns={columns}
    autoHeight
    initialState={{ pagination: { paginationModel: { pageSize: 2 } } }}
    pageSizeOptions={[2]}
    rangeLabel={({ from, to, count }) => `Showing ${from}-${to} of ${count} records`}
  />
);
