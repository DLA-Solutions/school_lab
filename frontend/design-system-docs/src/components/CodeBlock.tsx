import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

const CodeBlock = ({ code }: { code: string }) => (
  <Paper sx={{ p: 2, mb: 2, bgcolor: 'surface.alt', overflow: 'auto' }}>
    <Typography component="pre" variant="body2" sx={{ m: 0, fontFamily: 'monospace' }}>
      {code}
    </Typography>
  </Paper>
);

export default CodeBlock;
