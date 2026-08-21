import { Link as RouterLink } from 'react-router';
import paths from 'routes/paths';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Toolbar from '@mui/material/Toolbar';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import IconifyIcon from 'components/base/IconifyIcon';
import LanguageSelect from './LanguageSelect';
import ProfileMenu from './ProfileMenu';
import { useTranslation } from 'providers/I18nContext';
import { BrandLogo, ThemeToggle } from 'design-system';

interface TopbarProps {
  isClosing: boolean;
  mobileOpen: boolean;
  setMobileOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const Topbar = ({ isClosing, mobileOpen, setMobileOpen }: TopbarProps) => {
  const { t } = useTranslation();

  const handleDrawerToggle = () => {
    if (!isClosing) {
      setMobileOpen(!mobileOpen);
    }
  };

  return (
    <Stack alignItems="center" justifyContent="space-between" mb={{ xs: 0, lg: 1 }}>
      <Stack spacing={2} alignItems="center">
        <Toolbar sx={{ display: { xs: 'block', lg: 'none' } }}>
          <IconButton
            size="medium"
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={handleDrawerToggle}
          >
            <IconifyIcon icon="mingcute:menu-line" />
          </IconButton>
        </Toolbar>

        <ButtonBase
          component={RouterLink}
          to={paths.schools}
          disableRipple
          sx={{ display: { xs: 'inline-flex', lg: 'none' } }}
        >
          <BrandLogo variant="mark" height={28} />
        </ButtonBase>
      </Stack>

      <Stack spacing={1} alignItems="center">
        <ThemeToggle />
        <LanguageSelect />

        <Tooltip title={t('shell.notificationsComingSoon')}>
          <span>
            <IconButton
              size="large"
              sx={{ color: 'text.secondary' }}
              aria-label={t('shell.notificationsComingSoon')}
              onClick={(event) => event.preventDefault()}
            >
              <IconifyIcon icon="ion:notifications" />
            </IconButton>
          </span>
        </Tooltip>

        <ProfileMenu />
      </Stack>
    </Stack>
  );
};

export default Topbar;
