import { useState } from 'react';
import Button from '@mui/material/Button';
import { ConfirmDialog } from 'design-system';
import ComponentDocPage from '../../components/ComponentDocPage';

const ConfirmDialogDoc = () => {
  const [open, setOpen] = useState(false);
  return (
    <ComponentDocPage
      title="ConfirmDialog"
      description="Modal confirmation for destructive or important actions."
      whenToUse={['Delete confirmations', 'Irreversible actions']}
      whenNotToUse={['Simple dismissible info — use a Snackbar']}
      props={[
        { name: 'open', type: 'boolean', required: true, description: 'Dialog visibility' },
        { name: 'title', type: 'string', required: true, description: 'Dialog title' },
        { name: 'message', type: 'string', required: true, description: 'Body text' },
        { name: 'onConfirm', type: '() => void', required: true, description: 'Confirm handler' },
        { name: 'onCancel', type: '() => void', required: true, description: 'Cancel/close handler' },
        { name: 'destructive', type: 'boolean', description: 'Use error color on confirm' },
        {
          name: 'confirmLabel',
          type: 'string',
          description:
            "Label of the confirm button, default 'Confirm'. Name the action — 'Delete' beats 'Confirm' in a destructive dialog",
        },
        {
          name: 'cancelLabel',
          type: 'string',
          description: "Label of the cancel button, default 'Cancel'",
        },
      ]}
      code={`import { ConfirmDialog } from 'design-system';

<ConfirmDialog open={open} title="Delete?" message="..." onConfirm={...} onCancel={...} destructive />`}
      preview={
        <>
          <Button variant="contained" onClick={() => setOpen(true)}>
            Open dialog
          </Button>
          <ConfirmDialog
            open={open}
            title="Delete order?"
            message="This cannot be undone."
            onConfirm={() => setOpen(false)}
            onCancel={() => setOpen(false)}
            destructive
          />
        </>
      }
    />
  );
};

export default ConfirmDialogDoc;
