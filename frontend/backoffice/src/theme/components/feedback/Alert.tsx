import type { Theme, Components } from '@mui/material/styles';
import { alertClasses } from '@mui/material/Alert';

const Alert: Components<Omit<Theme, 'components'>>['MuiAlert'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      borderRadius: Number(theme.shape.borderRadius) * 2,
      border: '1px solid transparent',
      alignItems: 'center',
      fontSize: theme.typography.body2.fontSize,

      [`& .${alertClasses.icon}`]: {
        fontSize: theme.typography.h5.fontSize,
      },
    }),
    standardSuccess: ({ theme }) => {
      const palette = (theme.vars || theme).palette;

      return {
        color: palette.success.main,
        backgroundColor: palette.transparent.success.main,
        borderColor: palette.transparent.success.main,
      };
    },
    standardWarning: ({ theme }) => {
      const palette = (theme.vars || theme).palette;

      return {
        color: palette.warning.main,
        backgroundColor: palette.transparent.warning.main,
        borderColor: palette.transparent.warning.main,
      };
    },
    standardError: ({ theme }) => {
      const palette = (theme.vars || theme).palette;

      return {
        color: palette.error.main,
        backgroundColor: palette.transparent.error.main,
        borderColor: palette.transparent.error.main,
      };
    },
    standardInfo: ({ theme }) => {
      const palette = (theme.vars || theme).palette;

      return {
        color: palette.info.main,
        backgroundColor: palette.transparent.info.main,
        borderColor: palette.transparent.info.main,
      };
    },
    action: ({ theme }) => ({
      color: (theme.vars || theme).palette.text.secondary,
    }),
  },
};

export default Alert;
