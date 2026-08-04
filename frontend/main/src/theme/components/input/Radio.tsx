import type { Theme, Components } from '@mui/material/styles';
import { svgIconClasses } from '@mui/material';

const Radio: Components<Omit<Theme, 'components'>>['MuiRadio'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      color: (theme.vars || theme).palette.text.secondary,

      [`& .${svgIconClasses.root}`]: {
        fontSize: theme.typography.button.fontSize,
      },
    }),
    sizeSmall: ({ theme }) => ({
      [`& .${svgIconClasses.root}`]: {
        fontSize: theme.typography.caption.fontSize,
      },
    }),
  },
};

export default Radio;
