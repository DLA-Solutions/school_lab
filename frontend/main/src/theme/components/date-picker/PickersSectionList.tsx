import type { Theme, Components } from '@mui/material/styles';

/**
 * The date sections a picker field is made of — `MMM`, `YYYY`, and the separators between them.
 *
 * They read as a label rather than as an entered value, which is what the rest of the dashboard's
 * secondary text does.
 *
 * The section content is themed here rather than from `MuiPickersInputBase`, which also puts a
 * `sectionContent` class on this element: that slot resolves its overrides under the key `content`
 * instead (MUI X carries a `FIXME` about the mismatch), so a `sectionContent` entry written there
 * type-checks and silently styles nothing.
 */
const PickersSectionList: Components<Omit<Theme, 'components'>>['MuiPickersSectionList'] = {
  styleOverrides: {
    sectionContent: ({ theme }) => ({
      color: (theme.vars || theme).palette.text.secondary,
      fontSize: theme.typography.body2.fontSize,
      fontWeight: 500,
    }),
  },
};

export default PickersSectionList;
