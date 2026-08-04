import Typography from '@mui/material/Typography';
import { DocSection } from '../components/DocLayout';

const Introduction = () => (
  <>
    <DocSection
      id="introduction"
      title="Introduction"
      description="School Lab Design System — shared tokens, MUI theme, and pattern components for the web SPA."
    >
      <Typography variant="body1" paragraph>
        The design system lives in three layers: shared tokens in{' '}
        <code>packages/design-tokens</code>, MUI theme overrides in{' '}
        <code>frontend/main/src/theme/</code>, and product patterns in{' '}
        <code>frontend/main/src/design-system/</code>.
      </Typography>
      <Typography variant="body1" paragraph>
        Stack: React 19, MUI v7 + Emotion, dark mode by default with a light/dark toggle persisted
        in localStorage (<code>school-lab-color-mode</code>).
      </Typography>
      <Typography variant="body1" paragraph>
        Governance docs: <code>docs/guidelines/web-ui/</code>. Development catalog: Ladle (
        <code>npm run ladle</code> in frontend/main).
      </Typography>
    </DocSection>
  </>
);

export default Introduction;
