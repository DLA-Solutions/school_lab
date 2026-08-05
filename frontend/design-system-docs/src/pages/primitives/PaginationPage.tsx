import { useState } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Pagination from '@mui/material/Pagination';
import { DocSection } from '../../components/DocLayout';
import CodeBlock from '../../components/CodeBlock';
import LivePreview from '../../components/LivePreview';
import SpecTable from '../../components/SpecTable';

const layers = [
  [
    <code key="k">MuiPagination</code>,
    'defaultProps only',
    <span key="v">
      <code>color=&quot;primary&quot;</code> — the root is a <code>nav</code> around a{' '}
      <code>ul</code> and has nothing else to paint
    </span>,
  ],
  [
    <code key="k">MuiPaginationItem</code>,
    'styleOverrides',
    <span key="v">
      <code>neutral.light</code> label at <code>body2</code>, and{' '}
      <code>primary.main</code> behind <code>.Mui-selected</code> including its hover
    </span>,
  ],
];

const indexes = [
  ['Pagy (API)', '1-based', <code key="v">{'{ page: 1, pages: 7, count: 128 }'}</code>],
  ['DataGrid', '0-based', <code key="v">{'paginationModel.page === 0'}</code>],
  ['Pagination', '1-based', <code key="v">{'page={model.page + 1}'}</code>],
];

const PaginationPage = () => {
  const [page, setPage] = useState(3);

  return (
    <DocSection
      id="pagination"
      title="Pagination"
      description="The page control in the DataTable footer, and the three index bases it sits between."
    >
      <Typography variant="body1" paragraph>
        Pagination appears in exactly one place in the product: the footer <code>DataTable</code>{' '}
        renders under a grid, next to the row range. It is not a page-level navigation control —
        list screens do not paginate anything except their table — so the theme keeps the override
        to the one decision that would otherwise be repeated at every call site, and leaves the
        visual contract with the item.
      </Typography>

      <SpecTable headers={['Override', 'Shape', 'What it decides']} rows={layers} />

      <Typography variant="h6" gutterBottom>
        Live control
      </Typography>
      <LivePreview>
        <Stack direction="column" spacing={2}>
          <Typography variant="body2" color="text.primary">
            {`${(page - 1) * 10 + 1}-${page * 10} of 128`}
          </Typography>
          <Pagination count={13} page={page} onChange={(_, value) => setPage(value)} />
        </Stack>
      </LivePreview>
      <Typography variant="body2" color="text.secondary" mb={2}>
        No <code>color</code> prop is passed above — the selected page is purple because the theme
        default says so.
      </Typography>

      <Typography variant="h6" gutterBottom>
        Three index bases, one screen
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        The API, the grid and the control disagree about where counting starts, and all three meet
        in the footer. Convert at the boundary and keep the grid&apos;s 0-based model as the single
        source of truth in component state.
      </Typography>
      <SpecTable headers={['Layer', 'First page is', 'Looks like']} rows={indexes} />
      <CodeBlock
        code={`// design-system/data/DataTable.tsx — the footer slot
<Pagination
  count={pageCount}
  page={page + 1}
  onChange={(event, value) => {
    event.preventDefault();
    apiRef.current.setPage(value - 1);
  }}
/>`}
      />

      <Typography variant="h6" gutterBottom>
        Server pagination
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        The control only ever moves a page; who owns the data is decided one level up. List
        endpoints are paginated by the API, so the call site must pass{' '}
        <code>paginationMode=&quot;server&quot;</code> with <code>rowCount</code> from the response
        and a controlled <code>paginationModel</code>. Without them the grid falls back to its
        client-side default and quietly paginates whatever happens to be in memory — which means
        the first page looks right and the total is wrong.
      </Typography>
      <CodeBlock
        code={`<DataTable
  rows={data.items}
  columns={columns}
  paginationMode="server"
  rowCount={data.pagination.count}
  paginationModel={model}
  onPaginationModelChange={setModel}
/>`}
      />

      <Typography variant="h6" gutterBottom>
        Do
      </Typography>
      <ul>
        <li>
          <Typography variant="body2">
            Show the row range next to the control. “41-50 of 128” answers a question the page
            numbers do not.
          </Typography>
        </li>
        <li>
          <Typography variant="body2">
            Let the theme supply <code>color</code>, so a future change to the selected state lands
            everywhere at once.
          </Typography>
        </li>
        <li>
          <Typography variant="body2">
            Keep the page in the URL when a list is worth linking to, so a reload does not send the
            user back to page one.
          </Typography>
        </li>
      </ul>

      <Typography variant="h6" gutterBottom>
        Don&apos;t
      </Typography>
      <ul>
        <li>
          <Typography variant="body2">
            Fetch every page so the browser can paginate. That is a defect, not a shortcut — it
            grows with the school and leaks records the current page never needed.
          </Typography>
        </li>
        <li>
          <Typography variant="body2">
            Restyle the selected item at a call site; <code>PaginationItem</code> is the one place
            that decides it.
          </Typography>
        </li>
        <li>
          <Typography variant="body2">
            Mix bases. A <code>page - 1</code> that appears twice on the way to the API is the
            off-by-one waiting to happen.
          </Typography>
        </li>
      </ul>
    </DocSection>
  );
};

export default PaginationPage;
