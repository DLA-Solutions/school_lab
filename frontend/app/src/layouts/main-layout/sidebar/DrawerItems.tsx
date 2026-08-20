import { Fragment, useMemo } from 'react';
import Box from '@mui/material/Box';
import { Link as RouterLink, useLocation } from 'react-router';
import paths from 'routes/paths';
import List from '@mui/material/List';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import ListSubheader from '@mui/material/ListSubheader';
import ButtonBase from '@mui/material/ButtonBase';
import { BrandLogo } from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { useActiveMembership } from 'providers/ActiveMembershipContext';
import { visibleSitemap } from 'utils/navigation/visibleSitemap';
import {
  NAV_SECTION_LABEL_KEYS,
  NAV_SECTION_ORDER,
  groupMenuItemsBySection,
  isNavRouteActive,
} from 'utils/navigation/navSections';
import GlobalSearch from './GlobalSearch';
import ListItem from './list-items/ListItem';

const DrawerItems = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const activeMembership = useActiveMembership();
  const navItems = useMemo(() => visibleSitemap(activeMembership), [activeMembership]);
  const groupedItems = useMemo(() => groupMenuItemsBySection(navItems), [navItems]);
  const visibleSections = useMemo(
    () => NAV_SECTION_ORDER.filter((section) => groupedItems[section].length > 0),
    [groupedItems],
  );

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
        {visibleSections.map((section, sectionIndex) => {
          const items = groupedItems[section];
          const showDivider = sectionIndex > 0;
          const labelKey = NAV_SECTION_LABEL_KEYS[section];

          return (
            <Fragment key={section}>
              {showDivider && <Divider sx={{ my: 1.5 }} />}
              {labelKey && (
                <ListSubheader
                  disableSticky
                  sx={{
                    px: 1,
                    py: 0.75,
                    lineHeight: 1.4,
                    bgcolor: 'transparent',
                    color: 'text.secondary',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  {t(labelKey)}
                </ListSubheader>
              )}
              {items.map((route) => (
                <ListItem
                  key={route.id}
                  {...route}
                  active={isNavRouteActive(location.pathname, route.path, route.id)}
                />
              ))}
            </Fragment>
          );
        })}
      </List>
    </>
  );
};

export default DrawerItems;
