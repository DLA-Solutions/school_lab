import Box from '@mui/material/Box';
import { SxProps, Theme } from '@mui/material/styles';
import brasaoLight from 'assets/brand/brasao.png';
import brasaoDark from 'assets/brand/brasao_white.png';
import lockupLight from 'assets/brand/logo_lockup.png';
import lockupDark from 'assets/brand/logo_lockup_white.png';

export type BrandLogoVariant = 'mark' | 'lockup';

export interface BrandLogoProps {
  /**
   * `mark` — brasão only (compact slots: mobile topbar).
   * `lockup` — icon + “Scholar Premium” wordmark (sidebar, auth).
   */
  variant?: BrandLogoVariant;
  /** Rendered height in px. Width follows the asset aspect ratio. */
  height?: number;
  /** Accessible name. Decorative usages can pass an empty string and set `aria-hidden` via `sx`. */
  alt?: string;
  sx?: SxProps<Theme>;
}

const sources = {
  mark: { light: brasaoLight, dark: brasaoDark },
  lockup: { light: lockupLight, dark: lockupDark },
} as const;

/**
 * Theme-aware brand mark. Renders both light and dark assets and toggles with the document
 * colour-scheme class (`light` / `dark` on `<html>`), so the correct variant is visible on the
 * first paint — no `useColorScheme` hydration flash.
 *
 * - Light scheme → navy/gold assets (for white / light surfaces)
 * - Dark scheme (product default) → white/gold assets (for dark surfaces)
 */
const BrandLogo = ({
  variant = 'mark',
  height = 24,
  alt = 'Scholar Premium',
  sx,
}: BrandLogoProps) => {
  const { light, dark } = sources[variant];

  const imgBase = {
    height,
    width: 'auto',
    maxWidth: '100%',
    objectFit: 'contain' as const,
  };

  return (
    <Box
      sx={[
        {
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          height,
          lineHeight: 0,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Box
        component="img"
        src={light}
        alt={alt}
        sx={{
          ...imgBase,
          display: 'none',
          '.light &, [data-mui-color-scheme="light"] &': {
            display: 'block',
          },
        }}
      />
      <Box
        component="img"
        src={dark}
        alt=""
        aria-hidden
        sx={{
          ...imgBase,
          display: 'block',
          '.light &, [data-mui-color-scheme="light"] &': {
            display: 'none',
          },
        }}
      />
    </Box>
  );
};

export default BrandLogo;
