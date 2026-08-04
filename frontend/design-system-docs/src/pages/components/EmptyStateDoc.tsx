import Button from '@mui/material/Button';
import { EmptyState } from 'design-system';
import ComponentDocPage from '../../components/ComponentDocPage';

const EmptyStateDoc = () => (
  <ComponentDocPage
    title="EmptyState"
    description="Placeholder when a list or section has no data."
    whenToUse={['Zero rows after filter', 'New feature with no records yet']}
    whenNotToUse={['Loading — use skeleton/spinner', 'Errors — use ErrorBanner']}
    props={[
      { name: 'title', type: 'string', required: true, description: 'Primary message' },
      { name: 'description', type: 'string', description: 'Supporting text' },
      { name: 'action', type: 'ReactNode', description: 'CTA button or link' },
    ]}
    code={`import { EmptyState } from 'design-system';

<EmptyState title="No orders" action={<Button>Create</Button>} />`}
    preview={
      <EmptyState
        title="No orders found"
        description="Create an order to get started."
        action={<Button variant="contained" size="small">Create order</Button>}
      />
    }
  />
);

export default EmptyStateDoc;
