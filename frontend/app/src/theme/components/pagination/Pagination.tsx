import type { Theme, Components } from '@mui/material/styles';

const Pagination: Components<Omit<Theme, 'components'>>['MuiPagination'] = {
  defaultProps: {
    // The selected page is the one place in a paginated list that carries the brand purple, and
    // the PaginationItem override paints `.Mui-selected` with `primary.main` regardless. Without
    // this default `color` stays MUI's `'standard'`, so every call site has to remember to pass a
    // value the theme has already decided.
    color: 'primary',
  },
  // No styleOverrides on purpose. The root is a bare `nav` around a `ul`; everything visible —
  // size, radius, selected and hover colours — belongs to the item, and PaginationItem owns it.
  // Adding layout here would compete with the footer that positions the control.
};

export default Pagination;
