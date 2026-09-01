import { Link } from 'react-router';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import { DocSection } from '../components/DocLayout';
import CodeBlock from '../components/CodeBlock';
import SpecTable from '../components/SpecTable';

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
  { name: 'useChartTheme', path: '/components/use-chart-theme' },
];

const strings = [
  [<code key="k">ConfirmDialog</code>, 'confirmLabel, cancelLabel', "'Confirm', 'Cancel'"],
  [<code key="k">DataTable</code>, 'rangeLabel', "'1-25 of 400'"],
  [<code key="k">ErrorBanner</code>, 'retryLabel', "'Retry'"],
  [<code key="k">SearchField</code>, 'placeholder, ariaLabel', "'Search for...', 'Search'"],
  [
    <code key="k">ThemeToggle</code>,
    'switchToLightLabel, switchToDarkLabel',
    "'Switch to light mode', 'Switch to dark mode'",
  ],
];

const ComponentsIndex = () => (
  <>
    <DocSection
      id="components"
      title="Components"
      description="Pattern components with product-level APIs."
    >
      <List>
        {items.map((item) => (
          <ListItemButton key={item.path} component={Link} to={item.path}>
            <ListItemText primary={item.name} />
          </ListItemButton>
        ))}
      </List>
    </DocSection>

    <DocSection
      id="components-strings"
      title="Strings"
      description="Every user-facing string a pattern renders is a prop."
    >
      <Typography variant="body1" paragraph>
        A pattern component never owns a word the user reads. Each string it can render is a prop
        with an English default, so a screen that needs different wording — or a different language
        — passes it, and no caller has to fork the component to change a label. The product locale
        is pt-BR and the SPA has no i18n layer yet; the defaults below are what the codebase has
        always shipped, not a decision about which library will supply the translations.
      </Typography>

      <SpecTable headers={['Component', 'String props', 'Defaults']} rows={strings} />

      <Typography variant="body1" paragraph>
        Two of these are accessible names, not just visible text. <code>SearchField</code>&apos;s{' '}
        <code>ariaLabel</code> and <code>ThemeToggle</code>&apos;s tooltips are the only names those
        controls have, so leaving a default in place on a screen that needs a more specific one is
        an accessibility defect and not merely a wording one.
      </Typography>

      <CodeBlock
        code={`// Wording that belongs to the screen, passed by the screen.
<ConfirmDialog
  open={open}
  title="Delete enrolment?"
  message="The guardian keeps access to past invoices."
  confirmLabel="Delete enrolment"
  cancelLabel="Keep it"
  onConfirm={remove}
  onCancel={close}
  destructive
/>

<DataTable
  rows={rows}
  columns={columns}
  rangeLabel={({ from, to, count }) => \`\${from}-\${to} of \${count} students\`}
/>`}
      />

      <Typography variant="h6" gutterBottom>
        Do
      </Typography>
      <ul>
        <li>
          <Typography variant="body2">
            Give a string prop a default, so the common call site stays short.
          </Typography>
        </li>
        <li>
          <Typography variant="body2">
            Name the action rather than the mechanism — &quot;Delete enrolment&quot; over
            &quot;Confirm&quot;.
          </Typography>
        </li>
      </ul>

      <Typography variant="h6" gutterBottom>
        Don&apos;t
      </Typography>
      <ul>
        <li>
          <Typography variant="body2">
            Write a literal into a pattern component. If a new one is needed, it arrives as a prop
            in the same change.
          </Typography>
        </li>
        <li>
          <Typography variant="body2">
            Hand MUI&apos;s own strings to these props. The DataGrid&apos;s column menu and no-rows
            overlay come from <code>localeText</code>, not from <code>rangeLabel</code>.
          </Typography>
        </li>
      </ul>
    </DocSection>
  </>
);

export default ComponentsIndex;
