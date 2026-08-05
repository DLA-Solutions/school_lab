import Typography from '@mui/material/Typography';
import { DocSection } from '../components/DocLayout';
import CodeBlock from '../components/CodeBlock';
import SpecTable from '../components/SpecTable';

const noOverride = [
  [
    <code key="p">Box</code>,
    'No override',
    'A styled div with no appearance of its own — everything visible comes from the sx at the call site',
  ],
  [
    <code key="p">Grid</code>,
    'No override',
    "Inherits the theme's spacing and breakpoints, which is the whole of its behaviour",
  ],
  [
    <code key="p">SvgIcon</code>,
    'No override',
    'Sizing and colour come from the consumer; product icons come from Iconify',
  ],
  [
    <code key="p">DatePicker</code>,
    'No override',
    <>
      MUI X gives a picker no <code>styleOverrides</code> key at all — it is a composition, and each
      themable part carries its own. Themed on <code>MuiPickersOutlinedInput</code>,{' '}
      <code>MuiPickersSectionList</code>, <code>MuiMonthCalendar</code> and{' '}
      <code>MuiYearCalendar</code>
    </>,
  ],
  [
    <code key="p">Card*</code>,
    'Forbidden by default',
    <>
      Use <code>SectionCard</code>, the themed <code>Paper</code> with a title and a header-actions
      slot
    </>,
  ],
  [
    <code key="p">Table*</code>,
    'Forbidden by default',
    <>
      Use <code>DataTable</code>, which carries the grid override and the server-pagination contract
    </>,
  ],
];

const Theming = () => (
  <DocSection
    id="theming"
    title="Theming"
    description="MUI colorSchemes with class selector; default dark; toggle persists to localStorage."
  >
    <Typography variant="body1" paragraph>
      Use <code>ThemeProvider</code> with <code>defaultMode=&quot;dark&quot;</code> and{' '}
      <code>CssBaseline enableColorScheme</code>. The topbar <code>ThemeToggle</code> calls{' '}
      <code>useColorScheme().setMode</code>.
    </Typography>
    <CodeBlock
      code={`import { ThemeProvider, CssBaseline } from '@mui/material';
import { createAppTheme } from 'theme/createAppTheme';

const theme = createAppTheme();

<ThemeProvider theme={theme} defaultMode="dark">
  <CssBaseline enableColorScheme />
  {/* app */}
</ThemeProvider>`}
    />
    <Typography variant="body2" color="text.secondary" mb={4}>
      Storage key: <code>school-lab-color-mode</code> — values <code>light</code> or{' '}
      <code>dark</code> only (no system mode).
    </Typography>

    <Typography variant="h6" gutterBottom>
      Primitives with no override
    </Typography>
    <Typography variant="body2" color="text.secondary" mb={2}>
      Not every primitive needs one, one cannot take one, and two are not allowed at all. These are
      decisions, not gaps.
    </Typography>
    <SpecTable headers={['Primitive', 'Status', 'Reach for']} rows={noOverride} />
    <Typography variant="body2" color="text.secondary" mb={2}>
      <code>Card*</code> and <code>Table*</code> are forbidden by default in{' '}
      <code>frontend/main</code>, and deliberately carry no override. The ban formalises what the
      codebase already does — neither is imported anywhere in the product — and keeps one sanctioned
      route to each surface. An override is not the lighter alternative to a ban; it is the second
      route, and two routes to the same surface is how a visual language drifts. (This catalog is a
      separate app and renders its own reference tables with MUI <code>Table</code>.)
    </Typography>
    <Typography variant="body2" color="text.secondary" mb={2}>
      Revisit if a product screen needs genuinely static, non-paginated tabular content that{' '}
      <code>DataTable</code> is the wrong tool for — a printable report, a fixed reference matrix.
      That reopens the decision in <code>docs/open-questions.md</code> first; it does not authorise
      a local import.
    </Typography>
  </DocSection>
);

export default Theming;
