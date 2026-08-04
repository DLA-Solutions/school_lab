import { ReactNode, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
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
    ],
  },
  {
    title: 'Patterns',
    items: [
      { label: 'Page patterns', path: '/page-patterns' },
      { label: 'MUI primitives', path: '/mui-primitives' },
    ],
  },
];

const DocLayout = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const drawer = (
    <Box sx={{ py: 2 }}>
      <Typography variant="h6" px={2} pb={2} fontWeight={700}>
        School Lab DS
      </Typography>
      {navSections.map((section) => (
        <Box key={section.title} mb={2}>
          <Typography variant="overline" px={2} color="text.secondary">
            {section.title}
          </Typography>
          <List dense>
            {section.items.map((item) => (
              <ListItemButton
                key={item.path}
                component={Link}
                to={item.path}
                selected={location.pathname === item.path}
                onClick={() => setMobileOpen(false)}
              >
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      ))}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
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

      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 4 }, maxWidth: 960 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconButton
              sx={{ display: { md: 'none' } }}
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              ☰
            </IconButton>
            <Typography variant="h5" fontWeight={600}>
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
