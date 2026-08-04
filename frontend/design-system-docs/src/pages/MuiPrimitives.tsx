import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Paper from '@mui/material/Paper';
import { DocSection } from '../components/DocLayout';

const MuiPrimitives = () => (
  <DocSection
    id="mui-primitives"
    title="MUI primitives"
    description="Base MUI components styled by theme overrides in frontend/main/src/theme/components/."
  >
    <Stack spacing={2}>
      <Stack direction="row" spacing={1}>
        <Button variant="contained">Primary</Button>
        <Button variant="outlined">Outlined</Button>
        <Button variant="text">Text</Button>
      </Stack>
      <TextField variant="filled" placeholder="Filled input" size="small" />
      <Paper sx={{ p: 2 }}>Paper surface (card background)</Paper>
    </Stack>
  </DocSection>
);

export default MuiPrimitives;
