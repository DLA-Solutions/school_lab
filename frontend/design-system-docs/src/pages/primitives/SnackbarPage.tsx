import { useState } from 'react';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { DocSection } from '../../components/DocLayout';
import CodeBlock from '../../components/CodeBlock';
import LivePreview from '../../components/LivePreview';
import SpecTable from '../../components/SpecTable';

const defaults = [
  [
    <code key="k">anchorOrigin</code>,
    <code key="v">{"{ vertical: 'bottom', horizontal: 'right' }"}</code>,
    'MUI anchors bottom-left, which in this shell lands on the 300px sidebar',
  ],
  [
    <code key="k">autoHideDuration</code>,
    <code key="v">6000</code>,
    'MUI defaults to null — a toast that never leaves. Pass null back for one that must persist',
  ],
  [
    <code key="k">left / right</code>,
    <code key="v">{'theme.spacing(2)'}</code>,
    'Below sm the bar spans the viewport; 16px puts it on the shell’s own xs margin',
  ],
];

const choosing = [
  [
    <code key="k">Snackbar</code>,
    'The result of something the user just did',
    'Dismisses itself; never blocks the page',
  ],
  [
    <code key="k">Alert</code>,
    'A condition of the page that stays true',
    'Rendered in the layout, in place, and stays until the condition changes',
  ],
  [
    <code key="k">ErrorBanner</code>,
    'A failed request on the current screen',
    'The standard presentation of an ApiError; keeps the message next to what failed',
  ],
  [
    <code key="k">ConfirmDialog</code>,
    'A decision that must be taken before continuing',
    'Blocks; requires an answer',
  ],
];

const SnackbarPage = () => {
  const [plainOpen, setPlainOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);

  return (
    <DocSection
      id="snackbar"
      title="Snackbar"
      description="Transient confirmation of something that already happened, anchored clear of the sidebar."
    >
      <Typography variant="body1" paragraph>
        A snackbar reports an outcome the user does not have to act on: the message was sent, the
        enrolment was saved. It is the only feedback surface that disappears on its own, which is
        also the reason it must never carry information the user needs later — a failed save
        belongs in an <code>ErrorBanner</code> next to the form, where it survives long enough to
        be read twice.
      </Typography>

      <SpecTable headers={['Surface', 'Use for', 'Behaviour']} rows={choosing} />

      <Typography variant="h6" gutterBottom>
        Theme defaults
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        The root carries the placement decisions and <code>SnackbarContent</code> carries the
        surface — the dark <code>neutral.darker</code> pill with <code>body2</code> text. Both are
        registered in <code>theme/components/feedback/</code>, so a call site passes content and
        nothing else.
      </Typography>
      <SpecTable headers={['What', 'Value', 'Why']} rows={defaults} />

      <Typography variant="h6" gutterBottom>
        Plain message
      </Typography>
      <LivePreview>
        <Button variant="outlined" onClick={() => setPlainOpen(true)}>
          Save enrolment
        </Button>
        <Snackbar
          open={plainOpen}
          onClose={() => setPlainOpen(false)}
          message="Enrolment saved"
        />
      </LivePreview>
      <CodeBlock
        code={`// Placement and timing come from the theme.
<Snackbar
  open={open}
  onClose={() => setOpen(false)}
  message={t('students.enrolment_saved')}
/>`}
      />

      <Typography variant="h6" gutterBottom>
        With a severity
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        A snackbar that needs a colour wraps an <code>Alert</code> as its child. The alert then
        supplies the severity icon, the semantic <code>transparent.*</code> fill and the close
        button; the snackbar supplies only the position and the timer. Give the alert{' '}
        <code>onClose</code> as well, so a keyboard user can dismiss it before the timer runs out.
      </Typography>
      <LivePreview>
        <Button variant="contained" onClick={() => setAlertOpen(true)}>
          Send message to guardians
        </Button>
        <Snackbar open={alertOpen} onClose={() => setAlertOpen(false)}>
          <Alert severity="success" onClose={() => setAlertOpen(false)}>
            Message sent to 24 guardians
          </Alert>
        </Snackbar>
      </LivePreview>
      <CodeBlock
        code={`<Snackbar open={open} onClose={close}>
  <Alert severity="success" onClose={close}>
    {t('communication.message_sent', { count })}
  </Alert>
</Snackbar>`}
      />

      <Typography variant="body2" color="text.secondary" mb={2}>
        MUI shows one snackbar per mount, so two results arriving together overwrite each other.
        An app-level queue is a Phase 4 pattern in the layer PRD; until it exists, mount the
        snackbar in the screen that triggered the action and show one message at a time.
      </Typography>

      <Typography variant="h6" gutterBottom>
        Do
      </Typography>
      <ul>
        <li>
          <Typography variant="body2">
            Report what happened in the past tense, naming the record — “Enrolment saved”, not
            “Success”.
          </Typography>
        </li>
        <li>
          <Typography variant="body2">
            Let the theme place it. A call site that passes <code>anchorOrigin</code> is either
            fixing a bug the theme should fix, or drifting.
          </Typography>
        </li>
        <li>
          <Typography variant="body2">
            Keep the message translatable through an i18n key; the snackbar is product UI and reads
            pt-BR.
          </Typography>
        </li>
      </ul>

      <Typography variant="h6" gutterBottom>
        Don&apos;t
      </Typography>
      <ul>
        <li>
          <Typography variant="body2">
            Put an error the user must act on in a snackbar — it will be gone before they finish
            reading it.
          </Typography>
        </li>
        <li>
          <Typography variant="body2">
            Put an action in it that exists nowhere else. Anything undoable also needs a permanent
            route to the same operation.
          </Typography>
        </li>
        <li>
          <Typography variant="body2">
            Name a student, guardian or CPF in a message that may appear over another user&apos;s
            screen on a shared device.
          </Typography>
        </li>
      </ul>
    </DocSection>
  );
};

export default SnackbarPage;
