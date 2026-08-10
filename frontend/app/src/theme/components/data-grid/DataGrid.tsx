import { Theme, Components } from '@mui/material/styles';
import focusRing, { FOCUS_RING_WIDTH } from 'theme/styles/focusRing';

const DataGrid: Components<Omit<Theme, 'components'>>['MuiDataGrid'] = {
  styleOverrides: {
    root: ({ theme }) => {
      const palette = (theme.vars || theme).palette;

      return {
        border: 'none',
        background: 'transparent',
        '--DataGrid-rowBorderColor': 'transparent',
        '&:hover, &:focus': {
          '*::-webkit-scrollbar, *::-webkit-scrollbar-thumb': {
            visibility: 'visible',
          },
          '*::-webkit-scrollbar-thumb': {
            background: palette.background.default,
          },
        },
        '& .MuiDataGrid-scrollbar--vertical': {
          visibility: 'hidden',
        },
        '& .MuiDataGrid-filler': {
          height: '0 !important',
        },
        '& .MuiDataGrid-scrollbarFiller': {
          minWidth: 0,
        },
      };
    },
    virtualScroller: {
      overflowY: 'hidden',
    },
    columnHeaderCheckbox: {
      width: '70px !important',
    },
    cellCheckbox: {
      width: '70px',
    },
    columnHeaders: {
      background: 'transparent !important',
    },
    columnHeader: ({ theme }) => ({
      background: (theme.vars || theme).palette.background.paper,
      // The grid is a roving-tabindex widget: the ring is the only thing telling a keyboard user
      // where they are. Inset, because headers sit flush against each other. Repeating the slot
      // class outranks the grid's own focus rule, which is nested under the root class.
      '&.MuiDataGrid-columnHeader:focus-within': focusRing(theme, -FOCUS_RING_WIDTH),
    }),
    columnHeaderTitle: ({ theme }) => ({
      fontSize: theme.typography.caption.fontSize,
      letterSpacing: 0.5,
      fontWeight: 600,
    }),
    row: ({ theme }) => {
      const palette = (theme.vars || theme).palette;

      return {
        '&:hover': {
          background: 'transparent',
        },
        '&.Mui-selected': {
          background: 'transparent',
          '&:hover': {
            background: 'transparent',
          },
        },
        '&:nth-of-type(odd)': {
          background: palette.surface.alt,
          '&:hover': {
            background: palette.surface.alt,
          },
        },
        '&.MuiDataGrid-row--editing': {
          background: palette.secondary.darker,
          '& .MuiDataGrid-cell': {
            background: palette.secondary.darker,
          },
        },
      };
    },
    cell: ({ theme }) => ({
      color: (theme.vars || theme).palette.text.primary,
      fontSize: theme.typography.caption.fontSize,
      // Rows with `getRowHeight: () => 'auto'` align their content to the top, which leaves a
      // one-line cell sitting above its taller neighbours. Centring here covers both kinds of row.
      display: 'flex',
      alignItems: 'center',
      '&:hover': {
        cursor: 'pointer',
      },
      '&.MuiDataGrid-cell:focus-within': focusRing(theme, -FOCUS_RING_WIDTH),
      '& .MuiDataGrid-actionsCell': {
        gap: 0,
      },
    }),
    footerContainer: ({ theme }) => ({
      paddingTop: theme.spacing(3),
      border: 0,
      borderTop: 1,
      borderStyle: 'solid',
      borderColor: `${(theme.vars || theme).palette.background.default} !important`,
    }),
    columnSeparator: {
      display: 'none',
    },
    selectedRowCount: {
      display: 'none',
    },
    sortButton: {
      background: 'transparent !important',
    },
    sortIcon: ({ theme }) => ({
      color: (theme.vars || theme).palette.text.secondary,
    }),
    menuIconButton: ({ theme }) => ({
      color: (theme.vars || theme).palette.text.secondary,
    }),
    overlay: ({ theme }) => ({
      background: (theme.vars || theme).palette.surface.alt,
    }),
  },
};

export default DataGrid;
