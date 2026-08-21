import Typography from '@mui/material/Typography';
import { DocSection } from '../../components/DocLayout';
import CodeBlock from '../../components/CodeBlock';
import SpecTable from '../../components/SpecTable';

const baselineRows = [
  [
    <code key="v">html</code>,
    'box-sizing: border-box, inherited by every element',
    'Padding and border count inside a declared width',
  ],
  [
    <code key="v">html</code>,
    'Font smoothing, text-size-adjust: 100%',
    'Consistent rendering, no iOS font resize on rotation',
  ],
  [
    <code key="v">body</code>,
    'margin: 0, body1 typography, text.primary',
    'Inter metrics and colour inherited by everything',
  ],
  [
    <code key="v">body</code>,
    'background.default, white when printing',
    'Follows the color scheme on screen, saves ink on paper',
  ],
  [
    <code key="v">strong, b</code>,
    'fontWeight from the theme',
    'Bold text uses the type scale, not the UA default',
  ],
  [
    'Color scheme',
    <code key="v">enableColorScheme</code>,
    'Native controls and scrollbars follow the active scheme',
  ],
];

const overrideRows = [
  [
    <code key="v">*, *::before, *::after</code>,
    'margin: 0, padding: 0',
    'MUI only zeroes the body margin; this extends the reset to every element',
  ],
  [<code key="v">html</code>, 'scroll-behavior: smooth', 'Anchor jumps and scroll-to-top animate'],
  [
    <code key="v">body</code>,
    'font-variant-ligatures: none',
    'Disables ligatures so numerals stay aligned in dense tables',
  ],
  [
    <code key="v">body</code>,
    'background-color from the palette',
    'Reads background.default, so the page follows the color scheme',
  ],
  [
    <code key="v">*::-webkit-scrollbar</code>,
    '5px, thumb on background.paper',
    'Thin scheme-aware scrollbars replacing the platform default',
  ],
  [
    <code key="v">.simplebar-*</code>,
    'thumb on grey.300',
    'Sidebar custom scrollbar matches the native one',
  ],
  [
    <code key="v">.echarts-for-react</code>,
    'overflow hidden, height 100%',
    'Charts fill their card instead of overflowing it',
  ],
];

const Reboot = () => (
  <DocSection
    id="reboot"
    title="Reboot / CssBaseline"
    description="The global reset: MUI's CssBaseline plus the School Lab MuiCssBaseline override."
  >
    <Typography variant="body1" paragraph>
      There is no hand-written global stylesheet. Everything global goes through{' '}
      <code>CssBaseline</code>, which is mounted once at the application root and themed like any
      other primitive — the override lives in <code>theme/components/utils/CssBaseline.tsx</code> and
      is registered as <code>MuiCssBaseline</code>.
    </Typography>
    <CodeBlock
      code={`<ThemeProvider theme={createAppTheme()} defaultMode="dark">
  <CssBaseline enableColorScheme />
  <ThemeModeProvider>{app}</ThemeModeProvider>
</ThemeProvider>`}
    />

    <Typography variant="h6" gutterBottom>
      What MUI resets
    </Typography>
    <SpecTable headers={['Target', 'Declaration', 'Why it matters']} rows={baselineRows} />

    <Typography variant="h6" gutterBottom>
      What the School Lab override adds
    </Typography>
    <Typography variant="body2" color="text.secondary" mb={2}>
      The override is a function of the theme, so every value it emits is scheme-aware. It reads the
      palette through <code>(theme.vars || theme).palette</code>, which is what keeps it correct under{' '}
      <code>cssVariables</code>.
    </Typography>
    <SpecTable headers={['Selector', 'Declaration', 'Reason']} rows={overrideRows} />
    <CodeBlock
      code={`const CssBaseline: Components<Omit<Theme, 'components'>>['MuiCssBaseline'] = {
  styleOverrides: (theme) => {
    const palette = (theme.vars || theme).palette;

    return {
      '*, *::before, *::after': { margin: 0, padding: 0 },
      html: { scrollBehavior: 'smooth' },
      body: {
        fontVariantLigatures: 'none',
        backgroundColor: palette.background.default,
        ...scrollbar(theme),
      },
      ...simplebar(theme),
      ...echart(),
    };
  },
};`}
    />

    <Typography variant="h6" gutterBottom>
      Consequences for page code
    </Typography>
    <ul>
      <li>
        <Typography variant="body2">
          Headings and paragraphs carry no margin. Vertical rhythm comes from{' '}
          <code>Stack spacing</code>, <code>Grid spacing</code> or an explicit <code>mb</code> —
          never from a browser default.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Text colour is inherited from <code>body</code>. Set <code>color=&quot;text.secondary&quot;</code>{' '}
          where the hierarchy needs it, rather than restating the primary colour.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Scrollable panels get the thin themed scrollbar for free; do not re-style{' '}
          <code>::-webkit-scrollbar</code> per component.
        </Typography>
      </li>
    </ul>

    <Typography variant="h6" gutterBottom>
      Don&apos;t
    </Typography>
    <ul>
      <li>
        <Typography variant="body2">
          Add a global CSS file or import a third-party reset — the override is the only global
          surface.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Put component styling in <code>MuiCssBaseline</code>; a rule that targets one component
          belongs in that component&apos;s override.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Drop <code>enableColorScheme</code> — native controls would keep rendering light while the
          app is dark.
        </Typography>
      </li>
    </ul>
  </DocSection>
);

export default Reboot;
