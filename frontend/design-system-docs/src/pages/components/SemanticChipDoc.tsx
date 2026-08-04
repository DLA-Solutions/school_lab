import Stack from '@mui/material/Stack';
import { SemanticChip } from 'design-system';
import ComponentDocPage from '../../components/ComponentDocPage';

const SemanticChipDoc = () => (
  <ComponentDocPage
    title="SemanticChip"
    description="Status chip using transparent palette tokens."
    whenToUse={['Order/status labels', 'Success/warning/error/info badges']}
    whenNotToUse={['Neutral tags — use MUI Chip directly']}
    props={[
      { name: 'variant', type: 'success | warning | error | info', required: true, description: 'Semantic color' },
      { name: 'label', type: 'string', required: true, description: 'Chip label' },
      { name: 'width', type: 'number | string', description: 'Fixed chip width' },
    ]}
    code={`import { SemanticChip } from 'design-system';

<SemanticChip variant="success" label="Delivered" />`}
    preview={<SemanticChip variant="success" label="Delivered" width={80} />}
    variants={
      <Stack direction="row" spacing={1}>
        <SemanticChip variant="success" label="Success" />
        <SemanticChip variant="warning" label="Warning" />
        <SemanticChip variant="error" label="Error" />
        <SemanticChip variant="info" label="Info" />
      </Stack>
    }
  />
);

export default SemanticChipDoc;
