import { useMemo } from 'react';
import Box from '@mui/material/Box';
import { Link as RouterLink } from 'react-router';
import paths from 'routes/paths';
import List from '@mui/material/List';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import IconifyIcon from 'components/base/IconifyIcon';
import { BrandLogo } from 'design-system';
import { useAuth } from 'providers/AuthContext';
import { useCurrentSchool } from 'providers/useCurrentSchool';
import { visibleSitemap } from 'utils/navigation/visibleSitemap';
import GlobalSearch from './GlobalSearch';
import ListItem from './list-items/ListItem';

const DrawerItems = () => {
  const { logout } = useAuth();
  const school = useCurrentSchool();
  const navItems = useMemo(() => visibleSitemap(school), [school]);

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
      </Stack>

      <Box px={3.5} pb={3} pt={1}>
        <GlobalSearch />
      </Box>

      <List component="nav" sx={{ px: 2.5 }}>
        {navItems.map((route) => {
          return <ListItem key={route.id} {...route} />;
        })}
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
