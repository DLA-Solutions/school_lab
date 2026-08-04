import { tokens } from '@school-lab/design-tokens';

const dark = tokens.dark;

export const colors = {
  background: dark.background.default,
  surface: dark.background.paper,
  surfaceAlt: dark.surface.alt,
  primary: dark.primary.main,
  primaryDark: dark.primary.dark,
  textPrimary: dark.text.primary,
  textSecondary: dark.text.secondary,
  textDisabled: dark.text.disabled,
  border: dark.border.default,
  error: dark.error.main,
  success: dark.success.main,
  warning: dark.warning.main,
} as const;
