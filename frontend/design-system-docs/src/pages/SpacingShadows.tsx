import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { tokens } from '@school-lab/design-tokens';
import { DocSection } from '../components/DocLayout';

const SpacingShadows = () => (
  <DocSection id="spacing-shadows" title="Spacing & shadows" description="8px spacing unit; border radius 4px (12px on Paper).">
    <Typography variant="h6" gutterBottom>
      Spacing scale (theme.spacing)
    </Typography>
    <Stack spacing={1} mb={3}>
      {[1, 2, 3, 4].map((n) => (
        <Box key={n} sx={{ width: (t) => t.spacing(n), height: 24, bgcolor: 'primary.main' }} />
      ))}
    </Stack>
    <Typography variant="h6" gutterBottom>
      Custom shadows
    </Typography>
    <Stack direction="row" spacing={2}>
      {tokens.dark.customShadows.map((shadow, i) => (
        <Box key={shadow} sx={{ p: 2, boxShadow: shadow, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Typography variant="caption">dark[{i}]</Typography>
        </Box>
      ))}
    </Stack>
  </DocSection>
);

export default SpacingShadows;
