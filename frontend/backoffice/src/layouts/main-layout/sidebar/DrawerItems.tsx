import { topListData } from 'data/sidebarListData';
import { Link as RouterLink, useLocation } from 'react-router';
import paths from 'routes/paths';
import List from '@mui/material/List';
import Stack from '@mui/material/Stack';
import ButtonBase from '@mui/material/ButtonBase';
import { BrandLogo, ContextBadge } from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import ListItem from './list-items/ListItem';

const DrawerItems = () => {
  const location = useLocation();
  const { t } = useTranslation();

  const isRouteActive = (path?: string, id?: string) => {
    if (!path) {
      return false;
    }

    if (id === 'dashboard') {
      return location.pathname === paths.dashboard || location.pathname === paths.dashboardAlias;
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
        spacing={1}
      >
        <ButtonBase
          component={RouterLink}
          to={paths.dashboard}
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
        <ContextBadge
          variant="platform"
          label={t('nav.backoffice')}
          tooltip={t('shell.backofficeContextTooltip')}
        />
      </Stack>

      <List component="nav" sx={{ px: 2.5, pb: 12 }}>
        {topListData.map((route) => (
          <ListItem key={route.id} {...route} active={isRouteActive(route.path, route.id)} />
        ))}
      </List>
    </>
  );
};

export default DrawerItems;
