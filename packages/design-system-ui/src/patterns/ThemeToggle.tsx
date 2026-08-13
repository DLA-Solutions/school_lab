import IconButton, { IconButtonProps } from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { SxProps, Theme, useColorScheme } from '@mui/material/styles';
import IconifyIcon from '../IconifyIcon';

export interface ThemeToggleProps {
  /**
   * Shown while the dark scheme is on, when the button switches to light. The tooltip is also the
   * button's accessible name — the icon carries no text — so an override has to read as a label.
   */
  switchToLightLabel?: string;
  /** Shown while the light scheme is on, when the button switches to dark. */
  switchToDarkLabel?: string;
  size?: IconButtonProps['size'];
  sx?: SxProps<Theme>;
}

const ThemeToggle = ({
  switchToLightLabel = 'Switch to light mode',
  switchToDarkLabel = 'Switch to dark mode',
  size = 'large',
  sx,
}: ThemeToggleProps) => {
  const { mode, setMode } = useColorScheme();

  const isDark = mode === 'dark';

  const handleToggle = () => {
    const next = isDark ? 'light' : 'dark';
    setMode(next);
  };

  return (
    <Tooltip title={isDark ? switchToLightLabel : switchToDarkLabel}>
      <IconButton
        size={size}
        onClick={handleToggle}
        sx={[{ color: 'text.secondary' }, ...(Array.isArray(sx) ? sx : [sx])]}
      >
        <IconifyIcon icon={isDark ? 'mdi:weather-sunny' : 'mdi:weather-night'} />
      </IconButton>
    </Tooltip>
  );
};

export default ThemeToggle;
