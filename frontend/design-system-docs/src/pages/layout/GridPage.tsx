import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { DocSection } from '../../components/DocLayout';
import CodeBlock from '../../components/CodeBlock';
import LivePreview from '../../components/LivePreview';
import SpecTable from '../../components/SpecTable';

const props = [
  [<code key="k">container</code>, 'Turns the Grid into a row context that owns spacing'],
  [
    <code key="k">size</code>,
    'Columns the item spans, out of 12 — a number or a per-breakpoint object',
  ],
  [<code key="k">spacing</code>, 'Gutter between items, in spacing units (1 = 8px)'],
  [<code key="k">offset</code>, 'Empty columns pushed before the item'],
];

const cellSx = { p: 2, bgcolor: 'surface.alt', textAlign: 'center' } as const;

const GridPage = () => (
  <DocSection
    id="grid"
    title="Grid"
    description="Twelve columns, flexbox-based, spacing from the 8px scale."
  >
    <Typography variant="body1" paragraph>
      MUI v7 ships a single flexbox <code>Grid</code>. There is no <code>item</code> prop and no{' '}
      <code>xs={'{12}'}</code> shorthand: an item declares how many of the twelve columns it spans
      through <code>size</code>, and the parent <code>container</code> owns the gutter. Grid carries
      no School Lab override — it inherits the theme spacing and breakpoints, which is enough.
    </Typography>

    <SpecTable headers={['Prop', 'Meaning']} rows={props} />

    <Typography variant="h6" gutterBottom>
      Dashboard rhythm
    </Typography>
    <Typography variant="body2" color="text.secondary" mb={2}>
      Product pages reuse one gutter, <code>{'{ xs: 2.5, sm: 3, lg: 3.75 }'}</code>, so cards line up
      with the vertical spacing of the main layout. Full width on small screens, splitting only at{' '}
      <code>xl</code>.
    </Typography>
    <LivePreview>
      <Grid container spacing={{ xs: 2.5, sm: 3, lg: 3.75 }}>
        <Grid size={12}>
          <Paper sx={cellSx}>size={'{12}'}</Paper>
        </Grid>
        <Grid size={{ xs: 12, xl: 4 }}>
          <Paper sx={cellSx}>{'{ xs: 12, xl: 4 }'}</Paper>
        </Grid>
        <Grid size={{ xs: 12, xl: 8 }}>
          <Paper sx={cellSx}>{'{ xs: 12, xl: 8 }'}</Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={cellSx}>{'{ xs: 12, sm: 6, md: 3 }'}</Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={cellSx}>{'{ xs: 12, sm: 6, md: 3 }'}</Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={cellSx}>{'{ xs: 12, sm: 6, md: 3 }'}</Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={cellSx}>{'{ xs: 12, sm: 6, md: 3 }'}</Paper>
        </Grid>
      </Grid>
    </LivePreview>
    <CodeBlock
      code={`<Grid container spacing={{ xs: 2.5, sm: 3, lg: 3.75 }}>
  <Grid size={12}>
    <KPIs />
  </Grid>
  <Grid size={{ xs: 12, xl: 4 }}>
    <WebsiteVisitors />
  </Grid>
  <Grid size={{ xs: 12, xl: 8 }}>
    <RevenueByCustomer />
  </Grid>
</Grid>`}
    />

    <Typography variant="h6" gutterBottom>
      Grid or Stack?
    </Typography>
    <Typography variant="body2" color="text.secondary" mb={2}>
      Use <code>Grid</code> when children need to align to shared columns across rows — dashboards,
      card walls, two-column forms. Use <code>Stack</code> for a single axis of flow: a page&apos;s
      sections, a toolbar, a group of buttons. A <code>Stack</code> with one child that fills the row
      is a <code>Grid</code> that was not needed, and the reverse is also true.
    </Typography>

    <Typography variant="h6" gutterBottom>
      Do
    </Typography>
    <ul>
      <li>
        <Typography variant="body2">
          Keep the twelve columns intact — spans should sum to 12 per row at every breakpoint.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Start every item at <code>xs: 12</code> and split only where the content earns the room.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Express the gutter with <code>spacing</code>, so it scales with the theme.
        </Typography>
      </li>
    </ul>

    <Typography variant="h6" gutterBottom>
      Don&apos;t
    </Typography>
    <ul>
      <li>
        <Typography variant="body2">
          Use the MUI v5 API (<code>item</code>, <code>xs</code>, <code>md</code> as props) — it no
          longer exists in v7.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Add margins to grid items to fake a gutter; it breaks the negative-margin arithmetic.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Nest grids more than one level deep — reach for <code>Stack</code> inside a cell instead.
        </Typography>
      </li>
    </ul>
  </DocSection>
);

export default GridPage;
