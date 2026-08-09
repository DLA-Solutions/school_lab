import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { DataTable, SemanticChip } from 'design-system';
import {
  SchoolTransaction,
  TRANSACTION_CATEGORY_LABELS,
  TRANSACTION_KIND_LABELS,
} from 'types/transaction';
import { formatCents } from 'utils/money';

interface LedgerTableProps {
  rows: SchoolTransaction[];
  loading: boolean;
  total: number;
  page: number;
  onPageChange: (page: number) => void;
}

const PAGE_SIZE = 25;

const formatDate = (value: string) => {
  // Split rather than `new Date`: a bare ISO date parsed as UTC shows the day before here.
  const [year, month, day] = value.split('-');

  return `${day}/${month}/${year}`;
};

/** Money in is green, money out is red — the direction is the first thing the row has to say. */
const LedgerTable = ({ rows, loading, total, page, onPageChange }: LedgerTableProps) => {
  const columns: GridColDef<SchoolTransaction>[] = [
    {
      field: 'kind',
      headerName: 'Tipo',
      width: 120,
      renderCell: ({ value }: GridRenderCellParams<SchoolTransaction, SchoolTransaction['kind']>) => (
        <SemanticChip
          variant={value === 'income' ? 'success' : 'error'}
          label={TRANSACTION_KIND_LABELS[value ?? 'income']}
        />
      ),
    },
    {
      field: 'occurred_on',
      headerName: 'Data',
      width: 120,
      renderCell: ({ value }: GridRenderCellParams<SchoolTransaction, string>) => (
        <Typography variant="body2">{value ? formatDate(value) : '—'}</Typography>
      ),
    },
    {
      field: 'category',
      headerName: 'Categoria',
      flex: 1,
      minWidth: 170,
      renderCell: ({
        value,
      }: GridRenderCellParams<SchoolTransaction, SchoolTransaction['category']>) => (
        <Typography variant="body2">
          {value ? TRANSACTION_CATEGORY_LABELS[value] : '—'}
        </Typography>
      ),
    },
    {
      field: 'description',
      headerName: 'Descrição',
      flex: 2,
      minWidth: 200,
      renderCell: ({ value }: GridRenderCellParams<SchoolTransaction, string | null>) =>
        value ? (
          <Typography variant="body2">{value}</Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">
            —
          </Typography>
        ),
    },
    {
      field: 'signed_amount_cents',
      headerName: 'Valor',
      width: 150,
      align: 'right',
      headerAlign: 'right',
      renderCell: ({ value, row }: GridRenderCellParams<SchoolTransaction, number>) => (
        <Stack justifyContent="flex-end" sx={{ width: 1 }}>
          <Typography
            variant="body2"
            fontWeight={600}
            color={row.kind === 'income' ? 'success.main' : 'error.main'}
          >
            {`${row.kind === 'income' ? '+' : '−'} ${formatCents(Math.abs(value ?? 0))}`}
          </Typography>
        </Stack>
      ),
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      loading={loading}
      disableRowSelectionOnClick
      paginationMode="server"
      rowCount={total}
      pageSizeOptions={[PAGE_SIZE]}
      paginationModel={{ page, pageSize: PAGE_SIZE }}
      onPaginationModelChange={(model) => onPageChange(model.page)}
      rangeLabel={({ from, to, count }) => `${from}-${to} de ${count}`}
    />
  );
};

export default LedgerTable;
