import Typography from '@mui/material/Typography';
import { DocSection } from '../../components/DocLayout';
import CodeBlock from '../../components/CodeBlock';
import SpecTable from '../../components/SpecTable';

const layers = [
  [<code key="k">mobileStepper</code>, '1000', 'Step indicators pinned over content'],
  [<code key="k">fab</code>, '1050', 'Floating action button'],
  [<code key="k">speedDial</code>, '1050', 'Speed dial, same plane as the FAB'],
  [<code key="k">appBar</code>, '1100', 'Bars pinned to the top of the shell — the sidebar’s sticky brand header'],
  [<code key="k">drawer</code>, '1200', 'Sidebar and temporary drawers'],
  [<code key="k">modal</code>, '1300', 'Dialogs, including ConfirmDialog, and their backdrop'],
  [<code key="k">snackbar</code>, '1400', 'Transient feedback, readable over a dialog'],
  [<code key="k">tooltip</code>, '1500', 'Always on top — it can be triggered from anything'],
];

const ZIndex = () => (
  <DocSection
    id="z-index"
    title="Z-index"
    description="Eight named layers, declared explicitly in theme/zIndex.ts."
  >
    <Typography variant="body1" paragraph>
      The values match the MUI defaults on purpose. Writing them down turns stacking order into a
      contract the shell, the overlays and this catalog share, instead of a set of numbers rediscovered
      each time something renders behind a drawer.
    </Typography>
    <Typography variant="body1" paragraph>
      The ordering is deliberate: anything that can be summoned from anywhere sits above anything that
      is always present. A tooltip may be triggered from inside a dialog, so it outranks the modal
      layer; a snackbar reports the result of a dialog action, so it outranks the dialog too.
    </Typography>

    <SpecTable headers={['Key', 'Value', 'What lives here']} rows={layers} />

    <Typography variant="h6" gutterBottom>
      Reading a layer
    </Typography>
    <CodeBlock
      code={`// From sx, through the theme callback
<Box sx={{ position: 'sticky', top: 0, zIndex: (theme) => theme.zIndex.appBar }} />

// Just above a named layer
<Box sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }} />

// From a theme override
styleOverrides: {
  root: ({ theme }) => ({ zIndex: theme.zIndex.modal }),
}`}
    />

    <Typography variant="h6" gutterBottom>
      Positioning within a page
    </Typography>
    <Typography variant="body2" color="text.secondary" mb={2}>
      Most overlap inside a page is local: a badge over an avatar, a gradient over a chart. Those
      belong to their own stacking context and need small numbers, not theme layers. Create the
      context explicitly with <code>position: relative</code> on the parent and keep the children at{' '}
      <code>0</code> and <code>1</code>, so the page can never leak above the topbar.
    </Typography>
    <CodeBlock
      code={`<Box sx={{ position: 'relative' }}>
  <Chart />
  <Box sx={{ position: 'absolute', inset: 0, zIndex: 1 }}>
    <EmptyState title={t('charts.no_data')} />
  </Box>
</Box>`}
    />
    <Typography variant="body2" color="text.secondary" mb={2}>
      The website-visitors card is the worked example: its header row is pulled down over the chart
      by a negative margin, so the Export button and the ECharts canvas share space. The Paper
      opens the context and the button sits at <code>1</code> inside it — a local overlap resolved
      locally, with nothing said about the rest of the shell.
    </Typography>

    <Typography variant="h6" gutterBottom>
      Do
    </Typography>
    <ul>
      <li>
        <Typography variant="body2">
          Name the layer — <code>theme.zIndex.drawer</code> says what it is; <code>1200</code> does
          not.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Offset from a named layer when something must sit just above it:{' '}
          <code>theme.zIndex.drawer + 1</code>.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Contain local overlap in its own stacking context instead of bidding for a global layer.
        </Typography>
      </li>
    </ul>

    <Typography variant="h6" gutterBottom>
      Don&apos;t
    </Typography>
    <ul>
      <li>
        <Typography variant="body2">
          Write a literal <code>zIndex</code> that competes with a named layer. A number in the
          1000–1500 range is claiming a global layer without saying which one; either name it, or
          contain it in a local stacking context where <code>1</code> is enough.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Escalate to <code>9999</code>. If an element renders behind something, the cause is almost
          always a stacking context above it, not a value that is too low.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Add a new layer to <code>theme/zIndex.ts</code> for a single screen; MUI&apos;s eight cover
          every overlay the product has.
        </Typography>
      </li>
    </ul>
  </DocSection>
);

export default ZIndex;
