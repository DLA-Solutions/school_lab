import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import LivePreview from '../../components/LivePreview';

const ButtonsSection = () => (
  <LivePreview>
    <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
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
);

export default ButtonsSection;
