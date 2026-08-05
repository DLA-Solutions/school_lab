import Typography from '@mui/material/Typography';
import { DocSection } from '../../components/DocLayout';
import CodeBlock from '../../components/CodeBlock';
import SpecTable from '../../components/SpecTable';

const maxWidths = [
  ['xs', '444px', 'Not used today — narrower than the auth card'],
  ['sm', '600px', 'Single-column dialogs and confirmation screens'],
  ['md', '900px', 'Standalone pages outside the shell (Error404)'],
  ['lg', '1200px', 'Reading-width content pages'],
  ['xl', '1536px', 'Rarely needed — the shell already fills the viewport'],
];

const gutters = [
  [<code key="k">xs</code>, <code key="v">{'theme.spacing(2)'}</code>, 'MainLayout p={{ xs: 2 }}'],
  [<code key="k">sm</code>, <code key="v">{'theme.spacing(3)'}</code>, 'MainLayout p={{ sm: 3 }}'],
  [<code key="k">lg</code>, <code key="v">{'theme.spacing(5)'}</code>, 'MainLayout p={{ lg: 5 }} — MUI would have stayed at 24px'],
];

const shells = [
  [
    <code key="k">MainLayout</code>,
    'Viewport minus the 300px sidebar from lg',
    <code key="v">{'p={{ xs: 2, sm: 3, lg: 5 }}'}</code>,
    'Authenticated product pages',
  ],
  [
    <code key="k">AuthLayout</code>,
    'Centered Paper capped at 450px',
    <code key="v">{'p={{ xs: 1, md: 3.5 }}'}</code>,
    'Sign-in and password flows',
  ],
  [
    <code key="k">Container</code>,
    'maxWidth key, centered with gutters',
    <code key="v">{'maxWidth="md"'}</code>,
    'Standalone pages with no shell',
  ],
];

const Containers = () => (
  <DocSection
    id="containers"
    title="Containers"
    description="How horizontal space is bounded: the layout shells own page width, Container is the exception."
  >
    <Typography variant="body1" paragraph>
      Product pages do not set their own width. <code>MainLayout</code> renders the sidebar and a
      main <code>Stack</code> that carries the responsive padding and vertical rhythm; a page renders
      its sections directly into it. Wrapping a page in a <code>Container</code> inside the shell
      double-pads it and misaligns it from every other screen.
    </Typography>

    <SpecTable headers={['Shell', 'Bounds width by', 'Padding', 'Use for']} rows={shells} />

    <Typography variant="h6" gutterBottom>
      Page inside the shell
    </Typography>
    <CodeBlock
      code={`// pages/Students.tsx — no width, no padding, no Container
<>
  <PageHeader title={t('students.title')} />
  <SectionCard title={t('students.list')}>
    <DataTable rows={rows} columns={columns} />
  </SectionCard>
</>`}
    />

    <Typography variant="h6" gutterBottom>
      Container maxWidth values
    </Typography>
    <Typography variant="body2" color="text.secondary" mb={2}>
      <code>Container</code> derives its widths from the breakpoint values, except <code>xs</code>,
      which MUI floors at 444px.
    </Typography>
    <SpecTable headers={['maxWidth', 'Resolved width', 'Use for']} rows={maxWidths} />

    <Typography variant="h6" gutterBottom>
      Gutters
    </Typography>
    <Typography variant="body2" color="text.secondary" mb={2}>
      The override in <code>theme/components/layout/Container.tsx</code> steps the horizontal
      padding with the same values as the <code>MainLayout</code> main region, so a page rendered
      outside the shell lines up with one rendered inside it. The <code>xs</code> and{' '}
      <code>sm</code> steps happen to equal MUI&apos;s defaults; reading all three from{' '}
      <code>theme.spacing</code> ties them to the scale rather than to that coincidence.
    </Typography>
    <SpecTable headers={['From', 'Gutter', 'Matches']} rows={gutters} />
    <CodeBlock
      code={`import Container from '@mui/material/Container';

<Container maxWidth="md">
  <EmptyState title={t('errors.not_found.title')} />
</Container>`}
    />

    <Typography variant="h6" gutterBottom>
      Do
    </Typography>
    <ul>
      <li>
        <Typography variant="body2">
          Let <code>MainLayout</code> own page padding and section spacing.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Bound reading-heavy blocks with <code>maxWidth</code> on the block itself, the way the auth
          card caps at 450px.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Reserve <code>Container</code> for pages rendered outside the shell — errors, public
          screens, printable views.
        </Typography>
      </li>
    </ul>

    <Typography variant="h6" gutterBottom>
      Don&apos;t
    </Typography>
    <ul>
      <li>
        <Typography variant="body2">
          Nest a <code>Container</code> inside <code>MainLayout</code>.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Hardcode a page width in pixels; the shell already subtracts the 300px sidebar at{' '}
          <code>lg</code>.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Re-declare the shell padding on a page — it produces uneven gutters between screens.
        </Typography>
      </li>
    </ul>
  </DocSection>
);

export default Containers;
