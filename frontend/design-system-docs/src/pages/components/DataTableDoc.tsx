import Typography from '@mui/material/Typography';
import { DataTable, type DataTableProps } from 'design-system';
import ComponentDocPage from '../../components/ComponentDocPage';
import { DocSection } from '../../components/DocLayout';
import CodeBlock from '../../components/CodeBlock';
import SpecTable from '../../components/SpecTable';

type Row = { id: number; name: string };

const columns: NonNullable<DataTableProps['columns']> = [
  { field: 'id', headerName: 'ID', width: 80 },
  { field: 'name', headerName: 'Name', flex: 1 },
];

const rows: Row[] = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
];

const serverContract = [
  [
    <code key="k">paginationMode=&quot;server&quot;</code>,
    'Yes',
    'Stops the grid from slicing rows itself. Without it the grid ignores rowCount and paginates whatever it was handed',
  ],
  [
    <code key="k">rowCount</code>,
    'Yes',
    'The API\u2019s total, not rows.length — this is what the footer counts and divides into pages',
  ],
  [
    <code key="k">paginationModel</code>,
    'Yes',
    'Controlled { page, pageSize }; page is zero-based, the API is usually one-based',
  ],
  [
    <code key="k">onPaginationModelChange</code>,
    'Yes',
    'Fires on page change — refetch here, do not filter in memory',
  ],
  [
    <code key="k">loading</code>,
    'Strongly',
    'The rows are stale between the page change and the response',
  ],
  [
    <code key="k">sortingMode</code>,
    'When sortable',
    'Same reasoning: sorting one page of a paginated list sorts the wrong set',
  ],
];

const DataTableDoc = () => (
  <>
    <ComponentDocPage
      title="DataTable"
      description="MUI X DataGrid with the School Lab footer and column menu disabled."
      whenToUse={[
        'Lists of API data, paginated server-side with paginationMode="server"',
        'Dashboard tables matching OrdersStatus',
      ]}
      whenNotToUse={[
        'A handful of static rows — a SectionCard reads better',
        'Loading every page to paginate, sort or filter in the browser',
      ]}
      props={[
        {
          name: '...DataGridProps',
          type: 'DataGridProps',
          required: true,
          description: 'Forwarded to MUI DataGrid untouched',
        },
        {
          name: 'slots',
          type: 'DataGridProps["slots"]',
          description: 'Merged over the default slots; the pagination slot is the themed footer',
        },
        {
          name: 'rangeLabel',
          type: '(range: DataTableRange) => string',
          description:
            "Phrases the row-range summary on the left of the footer from { from, to, count }, default '1-25 of 400'. The grid's own strings — column menu, no-rows overlay, page-size selector — belong to MUI and are set through the forwarded localeText",
        },
      ]}
      code={`import { DataTable } from 'design-system';

<DataTable rows={rows} columns={columns} autoHeight />`}
      preview={
        <DataTable rows={rows} columns={columns} autoHeight checkboxSelection pageSizeOptions={[5]} />
      }
    />

    <DocSection
      id="data-table-server-pagination"
      title="Server-side pagination"
      description="The contract is the caller's to satisfy — DataTable does not enforce it."
    >
      <Typography variant="body1" paragraph>
        List endpoints are paginated by the API, so the browser only ever holds one page.{' '}
        <code>DataTable</code> is a thin wrapper: it sets the footer and disables the column menu,
        and forwards everything else to <code>DataGrid</code>. That means it also inherits the
        grid&apos;s default, which is to paginate <em>the rows it was handed</em> — perfectly happy
        to show &quot;1–10 of 10&quot; for a school with four hundred students.
      </Typography>
      <Typography variant="body1" paragraph>
        Nothing in the component stops that. The call site is what makes the pagination
        server-driven, by passing all of the following together.
      </Typography>

      <SpecTable headers={['Prop', 'Required', 'Why']} rows={serverContract} />

      <CodeBlock
        code={`const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });

// The API answers { data: [...], meta: { page, per_page, total } }
const { response, isLoading } = useStudents({
  page: paginationModel.page + 1,        // the grid is zero-based, the API is one-based
  per_page: paginationModel.pageSize,
});

<DataTable
  rows={response?.data ?? []}
  columns={columns}
  loading={isLoading}
  paginationMode="server"
  rowCount={response?.meta.total ?? 0}
  paginationModel={paginationModel}
  onPaginationModelChange={setPaginationModel}
  pageSizeOptions={[25, 50, 100]}
/>`}
      />

      <Typography variant="body2" color="text.secondary" mb={2}>
        Two details bite. <code>rowCount</code> must come from the API — passing{' '}
        <code>rows.length</code> collapses the footer to a single page. And it must not flip to{' '}
        <code>0</code> or <code>undefined</code> while the next page loads, or the grid resets the
        page index; keep the previous total until the new response arrives.
      </Typography>

      <Typography variant="h6" gutterBottom>
        Don&apos;t
      </Typography>
      <ul>
        <li>
          <Typography variant="body2">
            Request every page up front so the grid can paginate locally. It is slower, it goes
            stale, and on a large school it is a denial of service against your own API.
          </Typography>
        </li>
        <li>
          <Typography variant="body2">
            Leave <code>sortingMode</code> and <code>filterMode</code> on their client defaults for
            a server-paginated list — they would sort and filter the visible page only, which looks
            like data loss.
          </Typography>
        </li>
      </ul>
    </DocSection>
  </>
);

export default DataTableDoc;
