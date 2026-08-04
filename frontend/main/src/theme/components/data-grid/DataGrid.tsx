import { Theme, Components } from '@mui/material/styles';

const DataGrid: Components<Omit<Theme, 'components'>>['MuiDataGrid'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      border: 'none',
      background: 'transparent',
      '--DataGrid-rowBorderColor': 'transparent',
      '&:hover, &:focus': {
        '*::-webkit-scrollbar, *::-webkit-scrollbar-thumb': {
          visibility: 'visible',
        },
        '*::-webkit-scrollbar-thumb': {
          background: theme.palette.background.default,
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
    }),
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
      background: theme.palette.background.paper,
      '&:focus-within': {
        outline: 'none !important',
      },
    }),
    columnHeaderTitle: ({ theme }) => ({
      fontSize: theme.typography.caption.fontSize,
      letterSpacing: 0.5,
      fontWeight: 600,
    }),
    row: ({ theme }) => ({
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
        background: theme.palette.surface.alt,
        '&:hover': {
          background: theme.palette.surface.alt,
        },
      },
      '&.MuiDataGrid-row--editing': {
        background: theme.palette.secondary.darker,
        '& .MuiDataGrid-cell': {
          background: theme.palette.secondary.darker,
        },
      },
    }),
    cell: ({ theme }) => ({
      color: theme.palette.text.primary,
      fontSize: theme.typography.caption.fontSize,
      '&:hover': {
        cursor: 'pointer',
      },
      '&:focus-within': {
        outline: 'none !important',
      },
      '& .MuiDataGrid-actionsCell': {
        gap: 0,
      },
    }),
    footerContainer: ({ theme }) => ({
      paddingTop: theme.spacing(3),
      border: 0,
      borderTop: 1,
      borderStyle: 'solid',
      borderColor: `${theme.palette.background.default} !important`,
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
      color: theme.palette.text.secondary,
    }),
    menuIconButton: ({ theme }) => ({
      color: theme.palette.text.secondary,
    }),
    overlay: ({ theme }) => ({
      background: theme.palette.surface.alt,
    }),
  },
};

export default DataGrid;
