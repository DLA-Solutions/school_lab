import { ReactNode, useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText, { listItemTextClasses } from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import IconifyIcon from 'components/base/IconifyIcon';
import { ThemeToggle } from 'design-system';

const drawerWidth = 260;

const navSections = [
  {
    title: 'Foundations',
    items: [
      { label: 'Introduction', path: '/' },
      { label: 'Tokens', path: '/tokens' },
      { label: 'Typography', path: '/typography' },
      { label: 'Spacing & Shadows', path: '/spacing-shadows' },
      { label: 'Theming', path: '/theming' },
    ],
  },
  {
    title: 'Layout',
    items: [
      { label: 'Breakpoints', path: '/layout/breakpoints' },
      { label: 'Containers', path: '/layout/containers' },
      { label: 'Grid', path: '/layout/grid' },
      { label: 'Z-index', path: '/layout/z-index' },
    ],
  },
  {
    title: 'Content',
    items: [
      { label: 'Reboot / CssBaseline', path: '/content/reboot' },
      { label: 'Images', path: '/content/images' },
      { label: 'Tables', path: '/content/tables' },
    ],
  },
  {
    title: 'Forms',
    items: [
      { label: 'Overview', path: '/forms' },
      { label: 'Controls', path: '/forms/controls' },
      { label: 'Selection controls', path: '/forms/selection' },
      { label: 'Form layout', path: '/forms/layout' },
      { label: 'Validation', path: '/forms/validation' },
    ],
  },
  {
    title: 'Components',
    items: [
      { label: 'Overview', path: '/components' },
      { label: 'PageHeader', path: '/components/page-header' },
      { label: 'SectionCard', path: '/components/section-card' },
      { label: 'SearchField', path: '/components/search-field' },
      { label: 'SemanticChip', path: '/components/semantic-chip' },
      { label: 'EmptyState', path: '/components/empty-state' },
      { label: 'ErrorBanner', path: '/components/error-banner' },
      { label: 'ConfirmDialog', path: '/components/confirm-dialog' },
      { label: 'DataTable', path: '/components/data-table' },
      { label: 'ThemeToggle', path: '/components/theme-toggle' },
      { label: 'useChartTheme', path: '/components/use-chart-theme' },
    ],
  },
  {
    title: 'Primitives',
    items: [
      { label: 'Buttons', path: '/primitives/buttons' },
      { label: 'Form inputs', path: '/primitives/form-inputs' },
      { label: 'Surfaces', path: '/primitives/surfaces' },
      { label: 'Overlays', path: '/primitives/overlays' },
      { label: 'Data display', path: '/primitives/data-display' },
      { label: 'Navigation', path: '/primitives/navigation' },
      { label: 'Snackbar', path: '/primitives/snackbar' },
      { label: 'Popover', path: '/primitives/popover' },
      { label: 'Backdrop', path: '/primitives/backdrop' },
      { label: 'Pagination', path: '/primitives/pagination' },
    ],
  },
  {
    title: 'Utilities',
    items: [
      { label: 'sx conventions', path: '/utilities/sx' },
      { label: 'Stack & useFlexGap', path: '/utilities/stack' },
      { label: 'Text truncation', path: '/utilities/truncation' },
      { label: 'Visually hidden', path: '/utilities/visually-hidden' },
      { label: 'Aspect ratio', path: '/utilities/ratio' },
    ],
  },
  {
    title: 'Patterns',
    items: [{ label: 'Page patterns', path: '/page-patterns' }],
  },
];

const getActiveSectionTitle = (pathname: string) =>
  navSections.find((section) => section.items.some((item) => item.path === pathname))?.title;

const buildInitialOpenSections = (pathname: string) => {
  const activeSection = getActiveSectionTitle(pathname);

  return Object.fromEntries(
    navSections.map((section) => [section.title, section.title === activeSection]),
  );
};

const DocLayout = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSections, setOpenSections] = useState(() => buildInitialOpenSections(location.pathname));

  useEffect(() => {
    const activeSection = getActiveSectionTitle(location.pathname);
    if (!activeSection) return;

    setOpenSections((previous) =>
      previous[activeSection] ? previous : { ...previous, [activeSection]: true },
    );
  }, [location.pathname]);

  const toggleSection = (title: string) => {
    setOpenSections((previous) => ({ ...previous, [title]: !previous[title] }));
  };

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Typography variant="h6" px={2} py={2} fontWeight={700} flexShrink={0}>
        School Lab DS
      </Typography>
      <Divider />
      <Box sx={{ flex: 1, overflow: 'auto', py: 1 }}>
        {navSections.map((section, index) => {
          const isOpen = openSections[section.title];
          const hasActiveItem = section.items.some((item) => item.path === location.pathname);

          return (
            <Box key={section.title}>
              {index > 0 && <Divider sx={{ my: 0.5 }} />}
              <ListItemButton
                onClick={() => toggleSection(section.title)}
                aria-expanded={isOpen}
                sx={{
                  py: 1,
                  px: 2,
                  ...(hasActiveItem && !isOpen
                    ? { bgcolor: 'action.hover' }
                    : {}),
                }}
              >
                <ListItemText
                  primary={section.title}
                  primaryTypographyProps={{
                    variant: 'subtitle2',
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                  }}
                />
                <IconifyIcon
                  icon="mdi:chevron-down"
                  width={20}
                  height={20}
                  sx={{
                    color: 'text.secondary',
                    flexShrink: 0,
                    transition: 'transform 0.2s',
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
              </ListItemButton>
              <Collapse in={isOpen} timeout="auto" unmountOnExit>
                <List dense disablePadding>
                  {section.items.map((item) => {
                    const selected = location.pathname === item.path;

                    return (
                      <ListItemButton
                        key={item.path}
                        component={Link}
                        to={item.path}
                        selected={selected}
                        onClick={() => setMobileOpen(false)}
                        sx={{
                          pl: 3.5,
                          pr: 2,
                          py: 0.75,
                          borderLeft: '3px solid',
                          borderColor: selected ? 'primary.main' : 'transparent',
                          borderRadius: 0,
                          ...(selected
                            ? {
                                bgcolor: 'action.selected',
                                '&.Mui-selected:hover': { bgcolor: 'action.selected' },
                              }
                            : {}),
                        }}
                      >
                        <ListItemText
                          primary={item.label}
                          sx={{
                            [`& .${listItemTextClasses.primary}`]: {
                              fontSize: '0.875rem',
                              color: selected ? 'text.primary' : 'text.secondary',
                              fontWeight: selected ? 600 : 400,
                            },
                          }}
                        />
                      </ListItemButton>
                    );
                  })}
                </List>
              </Collapse>
            </Box>
          );
        })}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', overflowX: 'clip' }}>
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          // Flex items default to min-width:auto; without this, wide demos (Stepper, Tabs)
          // push the whole page into horizontal scroll.
          minWidth: 0,
          width: '100%',
          maxWidth: 960,
          p: { xs: 2, md: 4 },
          overflowX: 'clip',
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3} gap={2}>
          <Stack direction="row" alignItems="center" spacing={1} minWidth={0}>
            <IconButton
              sx={{ display: { md: 'none' } }}
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              ☰
            </IconButton>
            <Typography variant="h5" fontWeight={600} noWrap>
              School Lab Design System
            </Typography>
          </Stack>
          <ThemeToggle />
        </Stack>
        <Outlet />
      </Box>
    </Box>
  );
};

export default DocLayout;

export const DocSection = ({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) => (
  <Box id={id} mb={4}>
    <Typography variant="h4" gutterBottom>
      {title}
    </Typography>
    {description && (
      <Typography variant="body1" color="text.secondary" mb={2}>
        {description}
      </Typography>
    )}
    {children}
  </Box>
);
