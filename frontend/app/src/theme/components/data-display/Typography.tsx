import type { Theme, Components } from '@mui/material/styles';

const Typography: Components<Omit<Theme, 'components'>>['MuiTypography'] = {
  defaultProps: {
    // MUI maps both subtitle variants to `h6`, so every subtitle in the product — the EmptyState
    // title, the KPI caption, the client name in a DataGrid cell — enters the accessibility tree
    // as a heading and pollutes the document outline. The variants are body text at a smaller
    // size, never a section title, so they render as paragraphs. Unlisted variants keep MUI's
    // mapping (`Typography.js` falls back to it per variant), and `component` still wins when a
    // call site genuinely needs a heading.
    variantMapping: {
      subtitle1: 'p',
      subtitle2: 'p',
    },
  },
  styleOverrides: {
    // MUI's 0.35em is relative to the variant's own font size, so the gap under a heading changes
    // with the heading. Vertical rhythm comes from the 8px spacing scale like every other gap.
    gutterBottom: ({ theme }) => ({
      marginBottom: theme.spacing(1),
    }),
  },
};

export default Typography;
