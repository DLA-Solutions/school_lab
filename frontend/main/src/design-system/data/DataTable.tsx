import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Pagination from '@mui/material/Pagination';
import {
  DataGrid,
  DataGridProps,
  gridPageCountSelector,
  gridPageSelector,
  gridPageSizeSelector,
  gridRowCountSelector,
  useGridApiContext,
  useGridSelector,
} from '@mui/x-data-grid';

const DataGridFooter = () => {
  const apiRef = useGridApiContext();
  const page = useGridSelector(apiRef, gridPageSelector);
  const pageCount = useGridSelector(apiRef, gridPageCountSelector);
  const pageSize = useGridSelector(apiRef, gridPageSizeSelector);
  const rowsCount = useGridSelector(apiRef, gridRowCountSelector);

  return (
    <Stack alignItems="center" justifyContent="space-between" pl={3} pr={1.6} width={1}>
      <Typography variant="body2" color="text.primary">
        {`${page * pageSize + 1}-${Math.min(page * pageSize + pageSize, rowsCount)} of ${rowsCount}`}
      </Typography>
      <Pagination
        color="primary"
        count={pageCount}
        page={page + 1}
        onChange={(event, value) => {
          event.preventDefault();
          apiRef.current.setPage(value - 1);
        }}
      />
    </Stack>
  );
};

export type DataTableProps = DataGridProps;

const DataTable = ({ slots, ...rest }: DataTableProps) => {
  return (
    <DataGrid
      disableColumnMenu
      slots={{
        pagination: DataGridFooter,
        ...slots,
      }}
      {...rest}
    />
  );
};

export default DataTable;
