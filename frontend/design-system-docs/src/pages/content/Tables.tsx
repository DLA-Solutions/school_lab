import Typography from '@mui/material/Typography';
import { DocSection } from '../../components/DocLayout';
import CodeBlock from '../../components/CodeBlock';
import SpecTable from '../../components/SpecTable';

const decision = [
  [
    'Product data from the API',
    <code key="v">DataTable</code>,
    'Themed through MuiDataGrid, server pagination, empty and loading states',
  ],
  [
    'A handful of static rows',
    <code key="v">SectionCard</code>,
    'A definition list or a Stack usually reads better than a table',
  ],
  [
    'Reference matter in the catalog',
    'MUI Table',
    'Documentation only — this page is rendered with one',
  ],
  [
    'Tabular product content that is genuinely static',
    'Still DataTable',
    'MUI Table is forbidden by default — a real case reopens the decision, it does not bypass it',
  ],
];

const Tables = () => (
  <DocSection
    id="tables"
    title="Tables"
    description="DataTable is the way product data is tabulated; the MUI Table primitives are not."
  >
    <Typography variant="body1" paragraph>
      Tabular product data goes through <code>DataTable</code>, the pattern component wrapping{' '}
      <code>@mui/x-data-grid</code>. It is the only tabular surface with a theme override, and the
      only one that presents server-side pages — list endpoints are paginated by the API, and a grid
      that paginates a full dataset in the browser would quietly break that contract.
    </Typography>
    <Typography variant="body1" paragraph>
      The MUI <code>Table</code> family is <strong>forbidden by default</strong> in{' '}
      <code>frontend</code> and deliberately carries no override — a decided question, recorded
      in <code>docs/open-questions.md</code> (Web stack). It is not imported anywhere in the
      product, so the ban records the status quo rather than removing anything. A page that reaches
      for it is either presenting API data, which is <code>DataTable</code>&apos;s job, or
      presenting a short static list, which reads better as a card.
    </Typography>
    <Typography variant="body1" paragraph>
      No override was created alongside the ban, and that is the point: an override would be a
      second sanctioned way to render tabular data, and two of them is how the visual language
      drifts. Revisit if a screen needs genuinely static, non-paginated tabular content that{' '}
      <code>DataTable</code> is the wrong tool for — a printable report, a fixed reference matrix.
      Reopen the decision then; do not import <code>Table</code> locally in the meantime.
    </Typography>

    <SpecTable headers={['Content', 'Use', 'Why']} rows={decision} />

    <Typography variant="h6" gutterBottom>
      Listing API data
    </Typography>
    <CodeBlock
      code={`import { DataTable, PageHeader, SectionCard } from 'design-system';

<PageHeader title={t('students.title')} />
<SectionCard title={t('students.list')}>
  <DataTable
    rows={response.data}
    columns={columns}
    rowCount={response.meta.total}
    paginationMode="server"
    paginationModel={{ page, pageSize }}
    onPaginationModelChange={setPagination}
    loading={isLoading}
  />
</SectionCard>`}
    />
    <Typography variant="body2" color="text.secondary" mb={2}>
      See the <code>DataTable</code> page for the full prop list, the empty state and the footer.
    </Typography>

    <Typography variant="h6" gutterBottom>
      Column conventions
    </Typography>
    <ul>
      <li>
        <Typography variant="body2">
          Header labels come from i18n keys, never from the API field name.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Status columns render a <code>SemanticChip</code>, so state reads the same in a grid as it
          does on a detail page.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Numeric and currency columns are right-aligned; dates are formatted in the client, in pt-BR,
          from the ISO value the API returns.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Row actions live in a trailing column and are icon buttons with an accessible label.
        </Typography>
      </li>
    </ul>

    <Typography variant="h6" gutterBottom>
      Don&apos;t
    </Typography>
    <ul>
      <li>
        <Typography variant="body2">
          Fetch every page to sort or filter client-side — sorting and filtering are server concerns
          when the list is paginated.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Introduce <code>Table</code>, <code>TableRow</code> and friends into a product screen —
          they are forbidden by default.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Show a bare empty grid — pass the empty state so the screen explains itself.
        </Typography>
      </li>
    </ul>
  </DocSection>
);

export default Tables;
