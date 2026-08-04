import Stack from '@mui/material/Stack';
import { tokens } from '@school-lab/design-tokens';
import { DocSection } from '../components/DocLayout';
import TokenSwatch from '../components/TokenSwatch';
import TokenTable from '../components/TokenTable';

const semanticRows = [
  { token: 'background.default', dark: tokens.dark.background.default, light: tokens.light.background.default },
  { token: 'background.paper', dark: tokens.dark.background.paper, light: tokens.light.background.paper },
  { token: 'surface.alt', dark: tokens.dark.surface.alt, light: tokens.light.surface.alt },
  { token: 'text.primary', dark: tokens.dark.text.primary, light: tokens.light.text.primary },
  { token: 'text.secondary', dark: tokens.dark.text.secondary, light: tokens.light.text.secondary },
  { token: 'text.disabled', dark: tokens.dark.text.disabled, light: tokens.light.text.disabled },
  { token: 'border.default', dark: tokens.dark.border.default, light: tokens.light.border.default },
  { token: 'primary.main', dark: tokens.dark.primary.main, light: tokens.light.primary.main },
  { token: 'success.main', dark: tokens.dark.success.main, light: tokens.light.success.main },
  { token: 'warning.main', dark: tokens.dark.warning.main, light: tokens.light.warning.main },
  { token: 'error.main', dark: tokens.dark.error.main, light: tokens.light.error.main },
  { token: 'transparent.success', dark: tokens.dark.transparent.success, light: tokens.light.transparent.success },
  { token: 'transparent.warning', dark: tokens.dark.transparent.warning, light: tokens.light.transparent.warning },
  { token: 'transparent.error', dark: tokens.dark.transparent.error, light: tokens.light.transparent.error },
  { token: 'transparent.info', dark: tokens.dark.transparent.info, light: tokens.light.transparent.info },
];

const Tokens = () => (
  <>
    <DocSection id="tokens" title="Color tokens" description="Semantic tokens shared between web and mobile.">
      <Stack direction="row" flexWrap="wrap" gap={2} mb={3}>
        {semanticRows.slice(0, 6).map((row) => (
          <TokenSwatch key={row.token} name={row.token} value={row.dark} />
        ))}
      </Stack>
      <TokenTable rows={semanticRows} />
    </DocSection>
  </>
);

export default Tokens;
