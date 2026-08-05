import { ThemeToggle } from 'design-system';
import ComponentDocPage from '../../components/ComponentDocPage';

const ThemeToggleDoc = () => (
  <ComponentDocPage
    title="ThemeToggle"
    description="Icon button to switch between light and dark mode."
    whenToUse={['App topbar', 'Doc site header']}
    whenNotToUse={['Per-component theme — use useColorScheme in a provider']}
    props={[
      {
        name: 'switchToLightLabel',
        type: 'string',
        description:
          "Tooltip while the dark scheme is on, default 'Switch to light mode'. The tooltip is also the button's accessible name — the icon carries no text — so an override has to read as a label",
      },
      {
        name: 'switchToDarkLabel',
        type: 'string',
        description: "Tooltip while the light scheme is on, default 'Switch to dark mode'",
      },
      {
        name: 'size',
        type: "'small' | 'medium' | 'large'",
        description: "IconButton size, default 'large' to match the topbar",
      },
      {
        name: 'sx',
        type: 'SxProps<Theme>',
        description: 'Merged over the default text.secondary colour',
      },
    ]}
    code={`import { ThemeToggle } from 'design-system';

<ThemeToggle />

// Outside the topbar: a smaller control, labelled for its context.
<ThemeToggle size="small" switchToLightLabel={t('settings.theme.light')} />`}
    preview={<ThemeToggle />}
  />
);

export default ThemeToggleDoc;
