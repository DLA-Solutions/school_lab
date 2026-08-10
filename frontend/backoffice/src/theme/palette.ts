import { PaletteColorOptions, PaletteOptions } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface PaletteOptions {
    surface?: {
      main?: string;
      alt?: string;
    };
    neutral?: PaletteColorOptions;
    transparent?: {
      success: PaletteColorOptions;
      warning: PaletteColorOptions;
      error: PaletteColorOptions;
      info: PaletteColorOptions;
    };
    gradients?: {
      primary: PaletteColorOptions;
    };
  }
  interface SimplePaletteColorOptions {
    lighter?: string;
    darker?: string;
    state?: string;
  }
  interface Palette {
    surface: {
      main: string;
      alt: string;
    };
    neutral: PaletteColor;
    gradients: {
      primary: PaletteColor;
    };
    transparent: {
      success: PaletteColor;
      warning: PaletteColor;
      error: PaletteColor;
      info: PaletteColor;
    };
  }
  interface PaletteColor {
    lighter: string;
    darker: string;
    state: string;
  }
  interface TypeBackground {
    default: string;
    paper: string;
  }
}

export type { PaletteOptions };
