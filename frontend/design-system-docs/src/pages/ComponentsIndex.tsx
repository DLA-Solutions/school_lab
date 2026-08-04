import { Link } from 'react-router';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import { DocSection } from '../components/DocLayout';

const items = [
  { name: 'PageHeader', path: '/components/page-header' },
  { name: 'SectionCard', path: '/components/section-card' },
  { name: 'SearchField', path: '/components/search-field' },
  { name: 'SemanticChip', path: '/components/semantic-chip' },
  { name: 'EmptyState', path: '/components/empty-state' },
  { name: 'ErrorBanner', path: '/components/error-banner' },
  { name: 'ConfirmDialog', path: '/components/confirm-dialog' },
  { name: 'DataTable', path: '/components/data-table' },
  { name: 'ThemeToggle', path: '/components/theme-toggle' },
];

const ComponentsIndex = () => (
  <DocSection id="components" title="Components" description="Pattern components with product-level APIs.">
    <List>
      {items.map((item) => (
        <ListItemButton key={item.path} component={Link} to={item.path}>
          <ListItemText primary={item.name} />
        </ListItemButton>
      ))}
    </List>
  </DocSection>
);

export default ComponentsIndex;
