import { useState } from 'react';
import Button from '@mui/material/Button';
import { ConfirmDialog } from 'design-system';

export const Default = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="contained" onClick={() => setOpen(true)}>
        Open dialog
      </Button>
      <ConfirmDialog
        open={open}
        title="Delete order?"
        message="This action cannot be undone."
        onConfirm={() => setOpen(false)}
        onCancel={() => setOpen(false)}
        destructive
        confirmLabel="Delete"
      />
    </>
  );
};
