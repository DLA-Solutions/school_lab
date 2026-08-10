import type { BreakpointsOptions } from '@mui/material/styles';

/**
 * Declared on purpose even though the values match the MUI v7 defaults: the
 * responsive contract the SPA and the catalog document must live in the repo,
 * not in an inherited default that can change with a minor MUI bump.
 */
const breakpoints: BreakpointsOptions = {
  values: {
    xs: 0,
    sm: 600,
    md: 900,
    lg: 1200,
    xl: 1536,
  },
};

export default breakpoints;
