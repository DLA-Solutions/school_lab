import { ReactNode } from 'react';
import Paper from '@mui/material/Paper';

const LivePreview = ({ children }: { children: ReactNode }) => (
  <Paper sx={{ p: 3, mb: 2, bgcolor: 'background.default' }}>{children}</Paper>
);

export default LivePreview;
