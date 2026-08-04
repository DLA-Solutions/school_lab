import Typography from '@mui/material/Typography';
import { DocSection } from '../components/DocLayout';
import CodeBlock from '../components/CodeBlock';

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
    <Typography variant="body2" color="text.secondary">
      Storage key: <code>school-lab-color-mode</code> — values <code>light</code> or{' '}
      <code>dark</code> only (no system mode).
    </Typography>
  </DocSection>
);

export default Theming;
