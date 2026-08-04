import Button from '@mui/material/Button';
import { PageHeader } from 'design-system';

export const TitleOnly = () => <PageHeader title="Orders Status" />;

export const WithActions = () => (
  <PageHeader
    title="Orders Status"
    subtitle="Track and manage order fulfillment"
    actions={
      <>
        <Button variant="outlined" size="small">
          Export
        </Button>
        <Button variant="contained" size="small">
          Create order
        </Button>
      </>
    }
  />
);
