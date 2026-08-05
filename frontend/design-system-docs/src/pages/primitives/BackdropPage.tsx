import { useState } from 'react';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import { DocSection } from '../../components/DocLayout';
import CodeBlock from '../../components/CodeBlock';
import LivePreview from '../../components/LivePreview';
import SpecTable from '../../components/SpecTable';

const scrim = [
  [
    'Dark',
    <code key="v">{'alpha(background.default, 0.6)'}</code>,
    'The app dims with its own backdrop colour, so a dialog reads as the page receding',
  ],
  [
    'Light',
    <code key="v">{'alpha(text.primary, 0.5)'}</code>,
    'The light backdrop is near-white and would veil nothing; text.primary is its darkest token',
  ],
];

const mounts = [
  [<code key="k">Dialog</code>, 'Visible', 'Includes ConfirmDialog — the scrim is what makes it modal'],
  [<code key="k">Drawer</code>, 'Visible, temporary variant only', 'The mobile sidebar below lg'],
  [<code key="k">Menu</code>, 'Invisible', 'Present only to catch the outside click'],
  [<code key="k">Select</code>, 'Invisible', 'Same, through the Menu it renders'],
  [<code key="k">Popover</code>, 'Invisible', 'Same, unless the call site asks for a modal popover'],
];

const BackdropPage = () => {
  const [open, setOpen] = useState(false);

  return (
    <DocSection
      id="backdrop"
      title="Backdrop"
      description="The scrim under every modal surface — and the reason dropdowns do not get one."
    >
      <Typography variant="body1" paragraph>
        A backdrop is rarely mounted on purpose. It arrives with <code>Modal</code>, which means
        with every <code>Dialog</code>, every temporary <code>Drawer</code> and every{' '}
        <code>Menu</code>. Its job is to say that the page underneath is inert: it dims the
        content, absorbs the click that closes the overlay, and gives the dialog something to sit
        against so its own edges are legible.
      </Typography>

      <SpecTable headers={['Mounted by', 'Scrim', 'Note']} rows={mounts} />

      <Typography variant="h6" gutterBottom>
        Invisible is a class, not a component
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        A dropdown needs the click-catching half of a backdrop and none of the dimming, so MUI
        mounts the same element and marks it <code>.MuiBackdrop-invisible</code>. A theme override
        is serialised after that class, so an unguarded <code>root</code> rule would drop a scrim
        behind every open <code>Select</code>. The School Lab override paints only the visible
        case.
      </Typography>
      <CodeBlock
        code={`// theme/components/feedback/Backdrop.tsx
root: ({ theme }) => ({
  [\`&:not(.\${backdropClasses.invisible})\`]: {
    backgroundColor: theme.alpha(palette.background.default, 0.6),
    ...theme.applyStyles('light', {
      backgroundColor: theme.alpha(palette.text.primary, 0.5),
    }),
  },
}),`}
      />

      <Typography variant="h6" gutterBottom>
        Scrim per scheme
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        The two schemes cannot share one value, because the token that is right in the dark scheme
        is the page background itself. <code>theme.alpha</code> is used rather than a literal rgba:
        under <code>cssVariables</code> it rewrites the colour to its channel variable, so the
        scrim keeps following the active scheme instead of freezing at the default one.
      </Typography>
      <SpecTable headers={['Scheme', 'Value', 'Why']} rows={scrim} />
      <LivePreview>
        <Button variant="contained" color="error" onClick={() => setOpen(true)}>
          Delete enrolment
        </Button>
        <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Delete enrolment?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              The guardian keeps access to past messages. This cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)} color="inherit">
              Cancel
            </Button>
            <Button onClick={() => setOpen(false)} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </LivePreview>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Toggle the theme switch above with the dialog open to see both scrims.
      </Typography>

      <Typography variant="h6" gutterBottom>
        Do
      </Typography>
      <ul>
        <li>
          <Typography variant="body2">
            Let the overlay bring its own backdrop, and change the scrim in the theme when it is
            wrong for everyone.
          </Typography>
        </li>
        <li>
          <Typography variant="body2">
            Keep <code>onClose</code> wired so the backdrop click does what it looks like it does.
          </Typography>
        </li>
        <li>
          <Typography variant="body2">
            Reach for the <code>modal</code> z-index layer if something must sit above it —
            <code>theme.zIndex.modal</code>, never a literal.
          </Typography>
        </li>
      </ul>

      <Typography variant="h6" gutterBottom>
        Don&apos;t
      </Typography>
      <ul>
        <li>
          <Typography variant="body2">
            Mount a bare <code>Backdrop</code> with a spinner over a loading page. Show{' '}
            <code>Skeleton</code> in the shape of the content instead — it says what is coming and
            leaves the rest of the shell usable.
          </Typography>
        </li>
        <li>
          <Typography variant="body2">
            Override the scrim per screen. A dialog that needs a darker page behind it is a dialog
            with a contrast problem of its own.
          </Typography>
        </li>
        <li>
          <Typography variant="body2">
            Add a blur. It costs a repaint on every scroll behind the overlay and hides the context
            the user opened the dialog from.
          </Typography>
        </li>
      </ul>
    </DocSection>
  );
};

export default BackdropPage;
