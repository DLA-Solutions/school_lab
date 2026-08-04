import type { Theme, Components } from '@mui/material/styles';

const Avatar: Components<Omit<Theme, 'components'>>['MuiAvatar'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      fontSize: theme.typography.subtitle2.fontSize,
      fontWeight: 600,
    }),
    colorDefault: ({ theme }) => {
      const palette = (theme.vars || theme).palette;

      return {
        backgroundColor: palette.surface.alt,
        color: palette.text.secondary,
      };
    },
  },
};

export default Avatar;
