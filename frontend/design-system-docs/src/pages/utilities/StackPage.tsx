import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { DocSection } from '../../components/DocLayout';
import CodeBlock from '../../components/CodeBlock';
import LivePreview from '../../components/LivePreview';
import SpecTable from '../../components/SpecTable';

const defaults = [
  [
    <code key="k">direction</code>,
    <code key="v">&apos;row&apos;</code>,
    <code key="v">&apos;column&apos;</code>,
    'The shell and most compositions lay out horizontally',
  ],
  [
    <code key="k">useFlexGap</code>,
    <code key="v">true</code>,
    <code key="v">false</code>,
    'CSS gap instead of margins on children',
  ],
];

const itemSx = { px: 2, py: 1, bgcolor: 'surface.alt', borderRadius: 1 } as const;

const StackPage = () => (
  <DocSection
    id="stack"
    title="Stack and useFlexGap"
    description="The default layout primitive — with two School Lab defaults that differ from MUI."
  >
    <Typography variant="body1" paragraph>
      <code>Stack</code> is the first thing to reach for when elements flow along one axis. It is one
      of the few overrides that changes behaviour rather than appearance, so its defaults are worth
      knowing before reading any layout code in this repository.
    </Typography>

    <SpecTable
      headers={['Default prop', 'School Lab', 'MUI', 'Reason']}
      rows={defaults}
    />

    <Typography variant="h6" gutterBottom>
      Direction is row, not column
    </Typography>
    <Typography variant="body2" color="text.secondary" mb={2}>
      This is the one trap. A bare <code>&lt;Stack&gt;</code> lays out horizontally here, while the
      same code in the MUI documentation stacks vertically. Vertical layouts must say so.
    </Typography>
    <LivePreview>
      <Stack spacing={2}>
        <Box sx={itemSx}>row</Box>
        <Box sx={itemSx}>is</Box>
        <Box sx={itemSx}>the default</Box>
      </Stack>
    </LivePreview>
    <LivePreview>
      <Stack direction="column" spacing={2}>
        <Box sx={itemSx}>column</Box>
        <Box sx={itemSx}>is</Box>
        <Box sx={itemSx}>explicit</Box>
      </Stack>
    </LivePreview>
    <CodeBlock
      code={`// Horizontal — direction can be omitted
<Stack spacing={1} alignItems="center">
  <SearchField />
  <Button variant="contained">{t('actions.create')}</Button>
</Stack>

// Vertical — always spell it out
<Stack direction="column" spacing={3}>
  <PageHeader title={t('students.title')} />
  <SectionCard>{content}</SectionCard>
</Stack>`}
    />

    <Typography variant="h6" gutterBottom>
      Why useFlexGap
    </Typography>
    <Typography variant="body2" color="text.secondary" mb={2}>
      Without it, <code>spacing</code> is implemented as a margin on every child but the first. That
      leaks: a child with its own margin fights the generated one, wrapped rows lose their vertical
      gap, and conditionally rendered children shift the whole row. With <code>useFlexGap</code>,
      spacing is a real CSS <code>gap</code> owned by the container — wrapping works, and children
      keep their own margins to themselves.
    </Typography>
    <LivePreview>
      <Stack spacing={2} flexWrap="wrap">
        {['flexWrap', 'keeps', 'both', 'gaps', 'when', 'the', 'row', 'breaks'].map((word) => (
          <Box key={word} sx={itemSx}>
            {word}
          </Box>
        ))}
      </Stack>
    </LivePreview>
    <CodeBlock code={`<Stack spacing={2} flexWrap="wrap">{chips}</Stack>`} />

    <Typography variant="h6" gutterBottom>
      Do
    </Typography>
    <ul>
      <li>
        <Typography variant="body2">
          Express spacing with <code>spacing</code>, so it stays on the 8px scale.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Use responsive spacing where the shell does:{' '}
          <code>{'spacing={{ xs: 2.5, sm: 3, lg: 3.75 }}'}</code>.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Switch axis responsively with <code>{"direction={{ xs: 'column', md: 'row' }}"}</code>{' '}
          instead of rendering two trees.
        </Typography>
      </li>
    </ul>

    <Typography variant="h6" gutterBottom>
      Don&apos;t
    </Typography>
    <ul>
      <li>
        <Typography variant="body2">
          Assume a bare <code>Stack</code> is vertical — in this codebase it is not.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Put margins on stack children to fake spacing; the container owns the gap.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Turn <code>useFlexGap</code> off locally — a screen that needs the margin behaviour is
          usually a screen that needs <code>Grid</code>.
        </Typography>
      </li>
    </ul>
  </DocSection>
);

export default StackPage;
