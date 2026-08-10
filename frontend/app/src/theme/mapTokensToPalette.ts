import type { PaletteOptions } from '@mui/material/styles';
import { type SemanticTokens } from '@school-lab/design-tokens';

export function mapTokensToPalette(scheme: SemanticTokens): PaletteOptions {
  return {
    mode: undefined,
    background: {
      default: scheme.background.default,
      paper: scheme.background.paper,
    },
    surface: {
      main: scheme.background.paper,
      alt: scheme.surface.alt,
    },
    primary: {
      main: scheme.primary.main,
      dark: scheme.primary.dark,
    },
    secondary: {
      lighter: scheme.secondary.lighter,
      light: scheme.secondary.light,
      main: scheme.secondary.main,
      dark: scheme.secondary.dark,
      darker: scheme.secondary.darker,
    },
    info: {
      main: scheme.info.main,
      dark: scheme.info.dark,
      darker: scheme.info.darker,
    },
    success: {
      main: scheme.success.main,
    },
    warning: {
      main: scheme.warning.main,
    },
    error: {
      main: scheme.error.main,
    },
    text: {
      primary: scheme.text.primary,
      secondary: scheme.text.secondary,
      disabled: scheme.text.disabled,
    },
    divider: scheme.border.default,
    neutral: {
      lighter: scheme.neutral.lighter,
      light: scheme.neutral.light,
      main: scheme.neutral.main,
      dark: scheme.neutral.dark,
      darker: scheme.neutral.darker,
    },
    gradients: {
      primary: {
        main: scheme.gradients.primary.main,
        state: scheme.gradients.primary.state,
      },
    },
    transparent: {
      success: { main: scheme.transparent.success },
      warning: { main: scheme.transparent.warning },
      error: { main: scheme.transparent.error },
      info: { main: scheme.transparent.info },
    },
    grey: scheme.grey as PaletteOptions['grey'],
  };
}
