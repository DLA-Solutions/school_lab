import type { Theme, Components } from '@mui/material/styles';

/**
 * Labels stack above the field instead of floating into it. `InputBase` paints its own border and
 * uniform padding, and the `FilledInput` / `OutlinedInput` overrides zero the inner padding MUI
 * reserves for a floating label — so an animated label would sit on top of the value. Typography
 * and state colours come from the `MuiFormLabel` override, which `InputLabel` composes.
 */
const InputLabel: Components<Omit<Theme, 'components'>>['MuiInputLabel'] = {
  defaultProps: {
    shrink: true,
  },
  styleOverrides: {
    root: {
      position: 'static',
      transform: 'none',
      transformOrigin: 'top left',
      maxWidth: '100%',
      pointerEvents: 'auto',
    },
  },
};

export default InputLabel;
