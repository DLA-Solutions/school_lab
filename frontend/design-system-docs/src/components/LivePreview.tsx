import { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';

const LivePreview = ({ children }: { children: ReactNode }) => (
  <Paper
    sx={{
      p: { xs: 2, sm: 3 },
      mb: 2,
      bgcolor: 'background.default',
      maxWidth: '100%',
      overflow: 'hidden',
    }}
  >
    <Box sx={{ maxWidth: '100%', minWidth: 0 }}>{children}</Box>
  </Paper>
);

export default LivePreview;
