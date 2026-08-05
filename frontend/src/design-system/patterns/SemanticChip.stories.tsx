import Stack from '@mui/material/Stack';
import { SemanticChip } from 'design-system';

export const AllVariants = () => (
  <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
    <SemanticChip variant="success" label="Success" />
    <SemanticChip variant="warning" label="Warning" />
    <SemanticChip variant="error" label="Error" />
    <SemanticChip variant="info" label="Info" />
  </Stack>
);

export const WithCustomWidth = () => <SemanticChip variant="success" label="Delivered" width={80} />;
