import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { DataTable, SemanticChip } from 'design-system';
import {
  SchoolTransaction,
  TRANSACTION_CATEGORY_KEYS,
  TRANSACTION_KIND_KEYS,
} from 'types/transaction';
import { useTranslation } from 'providers/I18nContext';
import { formatCents } from 'utils/money';

interface LedgerTableProps {
  rows: SchoolTransaction[];
  loading: boolean;
  total: number;
  page: number;
  onPageChange: (page: number) => void;
}

const PAGE_SIZE = 25;

// Split rather than `new Date`: a bare ISO date parsed as UTC shows the day before here. The
// order follows the locale, since 05/09 is two different days on the two sides of the equator.
const formatDate = (value: string, locale: string) => {
  const [year, month, day] = value.split('-');

  return locale === 'en-US' ? `${month}/${day}/${year}` : `${day}/${month}/${year}`;
};

/** Money in is green, money out is red — the direction is the first thing the row has to say. */
const LedgerTable = ({ rows, loading, total, page, onPageChange }: LedgerTableProps) => {
  const { t, locale } = useTranslation();
  const columns: GridColDef<SchoolTransaction>[] = [
    {
      field: 'kind',
      headerName: t('ledger.form.kind'),
      width: 120,
      renderCell: ({ value }: GridRenderCellParams<SchoolTransaction, SchoolTransaction['kind']>) => (
        <SemanticChip
          variant={value === 'income' ? 'success' : 'error'}
          label={t(TRANSACTION_KIND_KEYS[value ?? 'income'])}
        />
      ),
    },
    {
      field: 'occurred_on',
      headerName: t('ledger.column.date'),
      width: 120,
      renderCell: ({ value }: GridRenderCellParams<SchoolTransaction, string>) => (
        <Typography variant="body2">{value ? formatDate(value, locale) : '—'}</Typography>
      ),
    },
    {
      field: 'category',
      headerName: t('ledger.column.category'),
      flex: 1,
      minWidth: 170,
      renderCell: ({
        value,
      }: GridRenderCellParams<SchoolTransaction, SchoolTransaction['category']>) => (
        <Typography variant="body2">
          {value ? t(TRANSACTION_CATEGORY_KEYS[value]) : '—'}
        </Typography>
      ),
    },
    {
      field: 'description',
      headerName: t('common.description'),
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
      headerName: t('common.amount'),
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
      rangeLabel={({ from, to, count }) => t('common.range', { from, to, count })}
    />
  );
};

export default LedgerTable;
