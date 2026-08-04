import { ThemeToggle } from 'design-system';
import ComponentDocPage from '../../components/ComponentDocPage';

const ThemeToggleDoc = () => (
  <ComponentDocPage
    title="ThemeToggle"
    description="Icon button to switch between light and dark mode."
    whenToUse={['App topbar', 'Doc site header']}
    whenNotToUse={['Per-component theme — use useColorScheme in a provider']}
    props={[]}
    code={`import { ThemeToggle } from 'design-system';

<ThemeToggle />`}
    preview={<ThemeToggle />}
  />
);

export default ThemeToggleDoc;
