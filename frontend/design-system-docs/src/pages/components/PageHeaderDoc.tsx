import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { PageHeader } from 'design-system';
import ComponentDocPage from '../../components/ComponentDocPage';

const PageHeaderDoc = () => (
  <ComponentDocPage
    title="PageHeader"
    description="Page title row with optional subtitle and action slot."
    whenToUse={['Top of list, detail, or settings pages', 'When actions belong next to the page title']}
    whenNotToUse={['Inside a card for a subsection — use SectionCard title instead']}
    props={[
      { name: 'title', type: 'string', required: true, description: 'Primary page title' },
      { name: 'subtitle', type: 'string', description: 'Optional supporting text' },
      { name: 'actions', type: 'ReactNode', description: 'Buttons or controls aligned to the right' },
    ]}
    code={`import { PageHeader } from 'design-system';

<PageHeader title="Orders" actions={<Button>New</Button>} />`}
    preview={<PageHeader title="Orders Status" />}
    variants={
      <PageHeader
        title="Orders Status"
        subtitle="Track fulfillment"
        actions={
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="outlined">
              Export
            </Button>
            <Button size="small" variant="contained">
              Create
            </Button>
          </Stack>
        }
      />
    }
  />
);

export default PageHeaderDoc;
