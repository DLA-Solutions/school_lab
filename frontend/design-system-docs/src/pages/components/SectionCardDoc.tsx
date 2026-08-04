import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { SectionCard } from 'design-system';
import ComponentDocPage from '../../components/ComponentDocPage';

const SectionCardDoc = () => (
  <ComponentDocPage
    title="SectionCard"
    description="Themed Paper wrapper for dashboard sections."
    whenToUse={['Grouping related content on a page', 'Tables, charts, or forms in a card']}
    whenNotToUse={['One-off layout without a card metaphor — use Stack/Box']}
    props={[
      { name: 'title', type: 'string', description: 'Optional header title' },
      { name: 'headerActions', type: 'ReactNode', description: 'Actions in the card header' },
      { name: 'children', type: 'ReactNode', required: true, description: 'Card body' },
      { name: 'padding', type: 'number', description: 'Paper padding override (0 removes default)' },
    ]}
    code={`import { SectionCard } from 'design-system';

<SectionCard title="Overview">{content}</SectionCard>`}
    preview={
      <SectionCard title="Revenue">
        <Typography px={3.5}>Section body</Typography>
      </SectionCard>
    }
    variants={
      <SectionCard title="Orders" headerActions={<Button size="small">New</Button>}>
        <Typography px={3.5}>With header action</Typography>
      </SectionCard>
    }
  />
);

export default SectionCardDoc;
