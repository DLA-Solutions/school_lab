import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import { SemanticChip } from 'design-system';
import LivePreview from '../../components/LivePreview';

const SurfacesSection = () => (
  <>
    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
      Paper — the base card surface, with 12px radius and scheme-aware shadow.
    </Typography>
    <LivePreview>
      <Paper sx={{ p: 2 }}>Paper surface (card background)</Paper>
    </LivePreview>

    <Typography variant="subtitle2" color="text.secondary" gutterBottom mt={3}>
      Chip — plain MUI chips vs. the semantic pattern component.
    </Typography>
    <LivePreview>
      <Stack direction="row" spacing={1} flexWrap="wrap">
        <Chip label="Default" />
        <Chip label="Outlined" variant="outlined" />
        <SemanticChip variant="success" label="Delivered" />
        <SemanticChip variant="warning" label="Pending" />
        <SemanticChip variant="error" label="Canceled" />
      </Stack>
    </LivePreview>

    <Typography variant="subtitle2" color="text.secondary" gutterBottom mt={3}>
      Alert — severities use the same transparent.* tokens as SemanticChip.
    </Typography>
    <LivePreview>
      <Stack spacing={1.5}>
        <Alert severity="success">Order delivered successfully.</Alert>
        <Alert severity="warning">Payment pending confirmation.</Alert>
        <Alert severity="error">Could not reach the API.</Alert>
        <Alert severity="info">A new version is available.</Alert>
      </Stack>
    </LivePreview>
  </>
);

export default SurfacesSection;
