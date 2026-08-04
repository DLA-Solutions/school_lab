import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import LivePreview from '../../components/LivePreview';

const ButtonsSection = () => (
  <>
    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
      Button — contained (gradient primary), outlined, text, and disabled states.
    </Typography>
    <LivePreview>
      <Stack direction="row" spacing={1.5} flexWrap="wrap">
        <Button variant="contained" color="primary">
          Primary
        </Button>
        <Button variant="contained" color="secondary">
          Secondary
        </Button>
        <Button variant="outlined" color="primary">
          Outlined
        </Button>
        <Button variant="text" color="primary">
          Text
        </Button>
        <Button variant="contained" disabled>
          Disabled
        </Button>
      </Stack>
    </LivePreview>
  </>
);

export default ButtonsSection;
