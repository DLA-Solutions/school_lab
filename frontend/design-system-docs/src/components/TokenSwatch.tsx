import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

const TokenSwatch = ({ name, value }: { name: string; value: string }) => (
  <Box>
    <Box
      sx={{
        width: 120,
        height: 64,
        borderRadius: 1,
        bgcolor: value,
        border: 1,
        borderColor: 'divider',
        mb: 1,
      }}
    />
    <Typography variant="caption" display="block" fontWeight={600}>
      {name}
    </Typography>
    <Typography variant="caption" color="text.secondary">
      {value}
    </Typography>
  </Box>
);

export default TokenSwatch;
