import { ThemeToggle } from 'design-system';

export const Default = () => <ThemeToggle />;

export const CustomLabels = () => (
  <ThemeToggle switchToLightLabel="Use the light theme" switchToDarkLabel="Use the dark theme" />
);

export const Small = () => <ThemeToggle size="small" />;
