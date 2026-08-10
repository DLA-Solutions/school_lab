import { createContext, useContext } from 'react';
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

export interface DataTableRange {
  /** One-based index of the first row on the page, as the footer prints it. */
  from: number;
  /** One-based index of the last row on the page. */
  to: number;
  /** Total rows the footer paginates — `rowCount` when the grid paginates server-side. */
  count: number;
}

const defaultRangeLabel = ({ from, to, count }: DataTableRange) => `${from}-${to} of ${count}`;

// The footer is a grid slot, so it is rendered by DataGrid rather than by DataTable and cannot be
// handed the label as a prop. Context keeps the slot component identity stable — passing a new
// closure through `slots` would remount the footer on every render and drop focus from the pager.
const RangeLabelContext = createContext<(range: DataTableRange) => string>(defaultRangeLabel);

const DataGridFooter = () => {
  const apiRef = useGridApiContext();
  const page = useGridSelector(apiRef, gridPageSelector);
  const pageCount = useGridSelector(apiRef, gridPageCountSelector);
  const pageSize = useGridSelector(apiRef, gridPageSizeSelector);
  const rowsCount = useGridSelector(apiRef, gridRowCountSelector);
  const rangeLabel = useContext(RangeLabelContext);

  return (
    <Stack alignItems="center" justifyContent="space-between" pl={3} pr={1.6} width={1}>
      <Typography variant="body2" color="text.primary">
        {rangeLabel({
          from: page * pageSize + 1,
          to: Math.min(page * pageSize + pageSize, rowsCount),
          count: rowsCount,
        })}
      </Typography>
      <Pagination
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

export type DataTableProps = DataGridProps & {
  /**
   * Prints the row-range summary on the left of the footer. Defaults to `1-25 of 400`. The grid's
   * own strings — column menu, no-rows overlay, page-size selector — are MUI's and are set through
   * the forwarded `localeText`, not here.
   */
  rangeLabel?: (range: DataTableRange) => string;
};

const DataTable = ({ slots, rangeLabel = defaultRangeLabel, ...rest }: DataTableProps) => {
  return (
    <RangeLabelContext.Provider value={rangeLabel}>
      <DataGrid
        disableColumnMenu
        slots={{
          pagination: DataGridFooter,
          ...slots,
        }}
        {...rest}
      />
    </RangeLabelContext.Provider>
  );
};

export default DataTable;
