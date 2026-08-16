import { useMemo } from 'react';
import Box from '@mui/material/Box';
import { Link as RouterLink } from 'react-router';
import paths from 'routes/paths';
import List from '@mui/material/List';
import Stack from '@mui/material/Stack';
import ButtonBase from '@mui/material/ButtonBase';
import { BrandLogo } from 'design-system';
import { useActiveMembership } from 'providers/ActiveMembershipContext';
import { visibleSitemap } from 'utils/navigation/visibleSitemap';
import GlobalSearch from './GlobalSearch';
import ListItem from './list-items/ListItem';

const DrawerItems = () => {
  const activeMembership = useActiveMembership();
  const navItems = useMemo(() => visibleSitemap(activeMembership), [activeMembership]);

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

      <List component="nav" sx={{ px: 2.5, pb: 3 }}>
        {navItems.map((route) => {
          return <ListItem key={route.id} {...route} />;
        })}
      </List>
    </>
  );
};

export default DrawerItems;
