import Button from '@mui/material/Button';
import { EmptyState } from 'design-system';
import ComponentDocPage from '../../components/ComponentDocPage';

const EmptyStateDoc = () => (
  <ComponentDocPage
    title="EmptyState"
    description="Placeholder when a list or section has no data."
    whenToUse={[
      'Zero rows after filter',
      'New feature with no records yet',
      'headingLevel when the empty state is the page body — its title is then the only landmark a screen reader has',
    ]}
    whenNotToUse={[
      'Loading — use skeleton/spinner',
      'Errors — use ErrorBanner',
      'headingLevel inside a titled SectionCard — the card already carries the heading, and a second one duplicates it in the outline',
    ]}
    props={[
      { name: 'title', type: 'string', required: true, description: 'Primary message' },
      { name: 'description', type: 'string', description: 'Supporting text' },
      { name: 'action', type: 'ReactNode', description: 'CTA button or link' },
      {
        name: 'headingLevel',
        type: '2 | 3 | 4 | 5 | 6',
        description: 'Renders the title as a heading at this level. Omitted, it stays a paragraph',
      },
      {
        name: 'icon',
        type: 'ReactNode',
        description:
          'Optional decorative tile above the title. Omitted, no tile is rendered. When passed, the tile is aria-hidden, so whatever goes here must not carry meaning the title omits',
      },
    ]}
    code={`import { EmptyState } from 'design-system';

<EmptyState title="No orders" action={<Button>Create</Button>} />

// Whole-page empty state: the title is the section heading.
<EmptyState title="No orders" headingLevel={2} />`}
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
