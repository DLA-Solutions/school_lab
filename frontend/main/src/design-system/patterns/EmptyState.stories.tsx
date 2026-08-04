import Button from '@mui/material/Button';
import { EmptyState } from 'design-system';

export const Default = () => (
  <EmptyState
    title="No orders found"
    description="Try adjusting your search or create a new order."
    action={
      <Button variant="contained" size="small">
        Create order
      </Button>
    }
  />
);
