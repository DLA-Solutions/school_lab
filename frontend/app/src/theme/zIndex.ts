import type { ThemeOptions } from '@mui/material/styles';

/**
 * Declared on purpose even though the values match the MUI v7 defaults: the
 * stacking order is a contract shared by the shell, overlays and the catalog.
 * Read layers through `theme.zIndex.*` — never write a literal z-index.
 */
const zIndex: NonNullable<ThemeOptions['zIndex']> = {
  mobileStepper: 1000,
  fab: 1050,
  speedDial: 1050,
  appBar: 1100,
  drawer: 1200,
  modal: 1300,
  snackbar: 1400,
  tooltip: 1500,
};

export default zIndex;
