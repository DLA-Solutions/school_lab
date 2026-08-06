import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { SectionCard } from 'design-system';

export const WithTitle = () => (
  <SectionCard title="Revenue overview">
    <Typography px={3.5} pb={3.5}>
      Section content goes here.
    </Typography>
  </SectionCard>
);

export const WithHeaderActions = () => (
  <SectionCard
    title="Orders"
    headerActions={
      <Button variant="contained" size="small">
        New
      </Button>
    }
  >
    <Typography px={3.5} pb={3.5}>
      Table or list content.
    </Typography>
  </SectionCard>
);
