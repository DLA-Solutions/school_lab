import Button from '@mui/material/Button';
import { EmptyState } from 'design-system';
import IconifyIcon from 'components/base/IconifyIcon';

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

export const CustomIcon = () => (
  <EmptyState
    title="No students enrolled"
    description="Enrol a student to open the class."
    icon={
      <IconifyIcon icon="mingcute:user-add-line" fontSize="h5.fontSize" color="text.secondary" />
    }
  />
);
