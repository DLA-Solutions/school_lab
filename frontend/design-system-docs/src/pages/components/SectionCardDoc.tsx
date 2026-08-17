import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { SectionCard } from 'design-system';
import ComponentDocPage from '../../components/ComponentDocPage';

const SectionCardDoc = () => (
  <ComponentDocPage
    title="SectionCard"
    description="Themed Paper wrapper for dashboard sections."
    whenToUse={[
      'Grouping related content on a page',
      'Tables, charts, or forms in a card',
      'Anywhere you would otherwise reach for MUI Card — it is forbidden by default, and this is the card surface',
    ]}
    whenNotToUse={['One-off layout without a card metaphor — use Stack/Box']}
    props={[
      { name: 'title', type: 'string', description: 'Optional header title' },
      { name: 'headerActions', type: 'ReactNode', description: 'Actions in the card header' },
      { name: 'children', type: 'ReactNode', required: true, description: 'Card body' },
      {
        name: 'padding',
        type: 'number',
        description: 'Paper padding in theme spacing units (default 3.5; use 0 for edge-to-edge tables)',
      },
    ]}
    code={`import { SectionCard } from 'design-system';

<SectionCard title="Overview">{content}</SectionCard>`}
    preview={
      <SectionCard title="Revenue">
        <Typography>Section body</Typography>
      </SectionCard>
    }
    variants={
      <SectionCard title="Orders" headerActions={<Button size="small">New</Button>}>
        <Typography>With header action</Typography>
      </SectionCard>
    }
  />
);

export default SectionCardDoc;
