import colorsJson from './colors.json';

export type ColorScheme = 'light' | 'dark';

export interface SemanticTokens {
  background: {
    default: string;
    paper: string;
  };
  surface: {
    alt: string;
  };
  text: {
    primary: string;
    secondary: string;
    disabled: string;
  };
  border: {
    default: string;
  };
  primary: {
    main: string;
    dark: string;
  };
  secondary: {
    lighter: string;
    light: string;
    main: string;
    dark: string;
    darker: string;
  };
  success: {
    main: string;
  };
  warning: {
    main: string;
  };
  error: {
    main: string;
  };
  info: {
    main: string;
    dark: string;
    darker: string;
  };
  neutral: {
    lighter: string;
    light: string;
    main: string;
    dark: string;
    darker: string;
  };
  gradients: {
    primary: {
      main: string;
      state: string;
    };
  };
  transparent: {
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  customShadows: [string, string] | string[];
  grey: Record<string, string>;
  purple: Record<string, string>;
  cyan: Record<string, string>;
  blue: Record<string, string>;
}

export interface DesignTokens {
  light: SemanticTokens;
  dark: SemanticTokens;
}

export const tokens = colorsJson as DesignTokens;

export function getTokens(mode: ColorScheme): SemanticTokens {
  return tokens[mode];
}
