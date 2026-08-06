import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import { SemanticChip } from 'design-system';
import LivePreview from '../../components/LivePreview';

const SurfacesSection = () => (
  <Stack direction="column" spacing={3}>
    <Box>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Paper
      </Typography>
      <LivePreview>
        <Paper sx={{ p: 2 }}>Paper surface (card background)</Paper>
      </LivePreview>
    </Box>

    <Box>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Chip — plain MUI vs. SemanticChip
      </Typography>
      <LivePreview>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip label="Default" />
          <Chip label="Outlined" variant="outlined" />
          <SemanticChip variant="success" label="Delivered" />
          <SemanticChip variant="warning" label="Pending" />
          <SemanticChip variant="error" label="Canceled" />
        </Stack>
      </LivePreview>
    </Box>

    <Box>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Alert
      </Typography>
      <LivePreview>
        <Stack direction="column" spacing={1.5}>
          <Alert severity="success">Order delivered successfully.</Alert>
          <Alert severity="warning">Payment pending confirmation.</Alert>
          <Alert severity="error">Could not reach the API.</Alert>
          <Alert severity="info">A new version is available.</Alert>
        </Stack>
      </LivePreview>
    </Box>
  </Stack>
);

export default SurfacesSection;
