import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { useColorScheme } from '@mui/material/styles';
import IconifyIcon from 'components/base/IconifyIcon';

const ThemeToggle = () => {
  const { mode, setMode } = useColorScheme();

  const isDark = mode === 'dark';

  const handleToggle = () => {
    setMode(isDark ? 'light' : 'dark');
  };

  return (
    <Tooltip title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
      <IconButton size="large" onClick={handleToggle} sx={{ color: 'text.secondary' }}>
        <IconifyIcon icon={isDark ? 'mdi:weather-sunny' : 'mdi:weather-night'} />
      </IconButton>
    </Tooltip>
  );
};

export default ThemeToggle;
