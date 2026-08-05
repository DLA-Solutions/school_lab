import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { DocSection } from '../../components/DocLayout';
import CodeBlock from '../../components/CodeBlock';
import LivePreview from '../../components/LivePreview';
import SpecTable from '../../components/SpecTable';

const rows = [
  ['xs', '0px', 'Phones', 'Base layer — every responsive value starts here'],
  ['sm', '600px', 'Large phones, small tablets', 'First padding and spacing step-up'],
  ['md', '900px', 'Tablets', 'Two-column forms become comfortable'],
  ['lg', '1200px', 'Laptops', 'Sidebar becomes permanent (300px) in MainLayout'],
  ['xl', '1536px', 'Large desktops', 'Dashboard splits into 4/8 column pairs'],
];

const CurrentBreakpoint = () => {
  const theme = useTheme();
  const matches = {
    xl: useMediaQuery(theme.breakpoints.up('xl')),
    lg: useMediaQuery(theme.breakpoints.up('lg')),
    md: useMediaQuery(theme.breakpoints.up('md')),
    sm: useMediaQuery(theme.breakpoints.up('sm')),
  };
  const active = (['xl', 'lg', 'md', 'sm'] as const).find((key) => matches[key]) ?? 'xs';

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((key) => (
        <Box
          key={key}
          sx={{
            px: 2,
            py: 1,
            borderRadius: 1,
            bgcolor: key === active ? 'primary.main' : 'surface.alt',
            color: key === active ? 'primary.contrastText' : 'text.secondary',
          }}
        >
          <Typography variant="caption" fontWeight={600}>
            {key}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
};

const Breakpoints = () => (
  <DocSection
    id="breakpoints"
    title="Breakpoints"
    description="Five mobile-first breakpoints, declared explicitly in theme/breakpoints.ts."
  >
    <Typography variant="body1" paragraph>
      The values match the MUI defaults on purpose. They are written down so the responsive contract
      belongs to the repository instead of an inherited default, and so a MUI upgrade that changed
      them would be a visible diff rather than a silent reflow.
    </Typography>

    <SpecTable headers={['Key', 'Min width', 'Typical device', 'What changes here']} rows={rows} />

    <Typography variant="h6" gutterBottom>
      Resize to see the active breakpoint
    </Typography>
    <LivePreview>
      <CurrentBreakpoint />
    </LivePreview>

    <Typography variant="h6" gutterBottom>
      Responsive values in sx
    </Typography>
    <Typography variant="body2" color="text.secondary" mb={2}>
      Prefer the object form of any style prop over media queries. It is mobile-first: a key applies
      from its breakpoint upwards, so <code>xs</code> is the base and later keys only override.
    </Typography>
    <CodeBlock
      code={`<Stack
  direction="column"
  p={{ xs: 2, sm: 3, lg: 5 }}
  spacing={{ xs: 2.5, sm: 3, lg: 3.75 }}
  width={{ xs: 1, lg: 'calc(100% - 300px)' }}
/>`}
    />

    <Typography variant="h6" gutterBottom>
      Breakpoint helpers
    </Typography>
    <Typography variant="body2" color="text.secondary" mb={2}>
      When a rule cannot be expressed as a responsive value — nested selectors, or a style that has
      to disappear entirely — use the helpers instead of a literal pixel media query.
    </Typography>
    <CodeBlock
      code={`sx={{
  [theme.breakpoints.up('lg')]: { display: 'block' },
  [theme.breakpoints.down('md')]: { display: 'none' },
  [theme.breakpoints.between('sm', 'lg')]: { px: 3 },
}}

// Reading the match in JS (rendering decisions, not styling)
const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));`}
    />

    <Typography variant="h6" gutterBottom>
      Do
    </Typography>
    <ul>
      <li>
        <Typography variant="body2">
          Design the <code>xs</code> layout first and add keys only where the layout actually breaks.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Use <code>lg</code> as the desktop-shell boundary — that is where the sidebar stops being a
          temporary drawer.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Reuse the spacing rhythm already used by the shell (<code>{'{ xs: 2, sm: 3, lg: 5 }'}</code>
          ) so pages line up with their container.
        </Typography>
      </li>
    </ul>

    <Typography variant="h6" gutterBottom>
      Don&apos;t
    </Typography>
    <ul>
      <li>
        <Typography variant="body2">
          Write raw media queries such as <code>@media (min-width: 900px)</code>; they bypass the
          contract and drift when a value changes.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Add a custom breakpoint for a single screen — rework the layout, or accept the nearest key.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Use <code>useMediaQuery</code> to swap styles that a responsive <code>sx</code> value can
          express; it costs a re-render and breaks SSR-safe rendering.
        </Typography>
      </li>
    </ul>
  </DocSection>
);

export default Breakpoints;
