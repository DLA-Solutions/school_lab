import { topListData } from 'data/sidebarListData';
import Box from '@mui/material/Box';
import { Link as RouterLink, useLocation } from 'react-router';
import paths from 'routes/paths';
import List from '@mui/material/List';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import IconifyIcon from 'components/base/IconifyIcon';
import { BrandLogo } from 'design-system';
import { useAuth } from 'providers/AuthContext';
import { useTranslation } from 'providers/I18nContext';
import ListItem from './list-items/ListItem';

const DrawerItems = () => {
  const { logout } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();

  const isRouteActive = (path?: string) => {
    if (!path) {
      return false;
    }

    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <>
      <Stack
        pt={5}
        pb={4}
        px={3.5}
        position={'sticky'}
        top={0}
        bgcolor="background.default"
        alignItems="flex-start"
        justifyContent="flex-start"
        zIndex="appBar"
        width={1}
        spacing={0.5}
      >
        <ButtonBase
          component={RouterLink}
          to={paths.schools}
          disableRipple
          sx={{ width: 1, justifyContent: 'flex-start' }}
        >
          <BrandLogo
            variant="lockup"
            sx={{
              width: 1,
              maxWidth: 1,
              height: 'auto',
              '& img': {
                width: '100%',
                height: 'auto',
              },
            }}
          />
        </ButtonBase>
        <Typography variant="caption" color="text.secondary" px={0.5}>
          {t('nav.backoffice')}
        </Typography>
      </Stack>

      <List component="nav" sx={{ px: 2.5 }}>
        {topListData.map((route) => (
          <ListItem key={route.id} {...route} active={isRouteActive(route.path)} />
        ))}
      </List>

      <Box px={3.5} pt={6} pb={12} width={1}>
        <Button
          variant="contained"
          color="secondary"
          size="large"
          onClick={() => void logout()}
          startIcon={<IconifyIcon icon="material-symbols:logout" />}
          sx={{ width: 1 }}
        >
          Logout
        </Button>
      </Box>
    </>
  );
};

export default DrawerItems;
