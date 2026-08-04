import { DataTable } from 'design-system';
import { GridColDef } from '@mui/x-data-grid';
import ComponentDocPage from '../../components/ComponentDocPage';

const columns: GridColDef[] = [
  { field: 'id', headerName: 'ID', width: 80 },
  { field: 'name', headerName: 'Name', flex: 1 },
];

const rows = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
];

const DataTableDoc = () => (
  <ComponentDocPage
    title="DataTable"
    description="MUI X DataGrid with default footer pagination."
    whenToUse={['Client-side paginated lists (MVP)', 'Dashboard tables matching OrdersStatus']}
    whenNotToUse={['Server Pagy pagination — extend wrapper in billing feature']}
    props={[
      { name: '...DataGridProps', type: 'DataGridProps', required: true, description: 'Forwarded to MUI DataGrid' },
    ]}
    code={`import { DataTable } from 'design-system';

<DataTable rows={rows} columns={columns} autoHeight />`}
    preview={
      <DataTable rows={rows} columns={columns} autoHeight checkboxSelection pageSizeOptions={[5]} />
    }
  />
);

export default DataTableDoc;
