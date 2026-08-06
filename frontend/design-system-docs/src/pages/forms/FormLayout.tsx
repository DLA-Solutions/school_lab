import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import { SectionCard } from 'design-system';
import { DocSection } from '../../components/DocLayout';
import CodeBlock from '../../components/CodeBlock';
import LivePreview from '../../components/LivePreview';
import SpecTable from '../../components/SpecTable';

const rhythm = [
  ['Between fields in a group', <code key="v">spacing={2.5}</code>, '20px — close enough to read as one block'],
  ['Between field groups', <code key="v">spacing={4}</code>, '32px, usually with a group heading'],
  ['Label to control to helper text', 'Automatic', 'FormControl contributes a 6px column gap'],
  [
    'Above the action row',
    <code key="v">mt={1}</code>,
    '8px on top of the stack spacing — about 28px, so Submit is clearly not another field',
  ],
];

const widths = [
  ['Free text — name, address, subject', <code key="v">fullWidth</code>, 'The content has no natural length'],
  ['Bounded value — date, amount, code', 'A fixed width', 'A 12-character field that spans the card invites doubt'],
  ['One of a list', <code key="v">fullWidth</code>, 'The label and the longest option decide the width'],
];

const FormLayout = () => (
  <DocSection
    id="forms-layout"
    title="Form layout"
    description="How fields, groups and actions are arranged on a page."
  >
    <Typography variant="body1" paragraph>
      Forms are a single column of fields inside a <code>SectionCard</code>, under a{' '}
      <code>PageHeader</code>. That is the form page pattern the guidelines already describe, and
      it holds up because the reading order and the tab order are the same line. Two columns are an
      optimisation for wide screens, not the starting point.
    </Typography>

    <Typography variant="h6" gutterBottom>
      Stack is horizontal here
    </Typography>
    <Typography variant="body2" color="text.secondary" mb={2}>
      The <code>MuiStack</code> override defaults <code>direction</code> to <code>row</code>, unlike
      MUI. A form built with a bare <code>&lt;Stack&gt;</code> lays its fields out side by side.
      Every vertical stack in a form has to say <code>direction=&quot;column&quot;</code> — this is
      the single most common surprise when writing a form in this codebase.
    </Typography>
    <CodeBlock
      code={`// Fields side by side — almost never what a form wants
<Stack spacing={2.5}>…</Stack>

// One field per row
<Stack direction="column" spacing={2.5}>…</Stack>`}
    />

    <Typography variant="h6" gutterBottom>
      The single-column form
    </Typography>
    <LivePreview>
      <Box maxWidth={420}>
        <SectionCard title="New student">
          <Stack direction="column" spacing={2.5} px={3.5} pb={3.5}>
            <TextField variant="filled" size="small" label="Full name" fullWidth />
            <TextField
              variant="filled"
              size="small"
              label="Date of birth"
              placeholder="dd/mm/aaaa"
              sx={{ width: 180 }}
            />
            <TextField
              variant="filled"
              size="small"
              label="Notes"
              multiline
              minRows={2}
              fullWidth
            />
            <Stack direction="row" spacing={1.5} justifyContent="flex-end" mt={1}>
              <Button variant="text" color="inherit">
                Cancel
              </Button>
              <Button variant="contained">Save</Button>
            </Stack>
          </Stack>
        </SectionCard>
      </Box>
    </LivePreview>
    <CodeBlock
      code={`<PageHeader title={t('students.new')} />
<SectionCard title={t('students.details')}>
  <Stack direction="column" spacing={2.5} px={3.5} pb={3.5} component="form" onSubmit={handleSubmit}>
    {apiError && <ErrorBanner message={apiError} />}
    <TextField variant="filled" size="small" label={t('students.fields.name')} fullWidth />
    …
    <Stack direction="row" spacing={1.5} justifyContent="flex-end" mt={1}>
      <Button variant="text" color="inherit" onClick={onCancel}>{t('common.cancel')}</Button>
      <Button type="submit" variant="contained" disabled={submitting}>
        {t('common.save')}
      </Button>
    </Stack>
  </Stack>
</SectionCard>`}
    />

    <Typography variant="h6" gutterBottom>
      Spacing
    </Typography>
    <SpecTable headers={['Between', 'Use', 'Why']} rows={rhythm} />

    <Typography variant="h6" gutterBottom>
      Field width
    </Typography>
    <Typography variant="body2" color="text.secondary" mb={2}>
      Width is a hint about the value. Matching it to the expected content is free validation
      feedback that costs nothing and cannot be wrong, because it does not assert anything.
    </Typography>
    <SpecTable headers={['Field', 'Width', 'Why']} rows={widths} />

    <Typography variant="h6" gutterBottom>
      Two columns on wide screens
    </Typography>
    <Typography variant="body2" color="text.secondary" mb={2}>
      Pair fields only when they are genuinely one piece of information — a city and its state, a
      start and an end date. Use <code>Grid</code> with responsive sizes so the pair collapses back
      to one column below <code>md</code>, where two columns stop fitting.
    </Typography>
    <LivePreview>
      <Grid container spacing={2.5} maxWidth={520}>
        <Grid size={{ xs: 12, md: 8 }}>
          <TextField variant="filled" size="small" label="City" fullWidth />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField variant="filled" size="small" label="State" fullWidth />
        </Grid>
      </Grid>
    </LivePreview>
    <CodeBlock
      code={`<Grid container spacing={2.5}>
  <Grid size={{ xs: 12, md: 8 }}>
    <TextField variant="filled" size="small" label={t('address.city')} fullWidth />
  </Grid>
  <Grid size={{ xs: 12, md: 4 }}>
    <TextField variant="filled" size="small" label={t('address.state')} fullWidth />
  </Grid>
</Grid>`}
    />

    <Typography variant="h6" gutterBottom>
      Actions
    </Typography>
    <Typography variant="body2" color="text.secondary" mb={2}>
      The action row is right-aligned at the bottom of the card, with the primary action last.
      Submit is a real <code>type=&quot;submit&quot;</code> button inside a{' '}
      <code>component=&quot;form&quot;</code> stack, so Enter works and the browser announces the
      form as a form. While a request is in flight, disable Submit and show a{' '}
      <code>CircularProgress</code> in <code>startIcon</code> — the sign-in form is the reference.
    </Typography>

    <Typography variant="h6" gutterBottom>
      Do
    </Typography>
    <ul>
      <li>
        <Typography variant="body2">
          Put the API error at the top of the form, in an <code>ErrorBanner</code>, where it is read
          before the fields are re-examined.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Order fields the way the person filling them thinks — identity, then contact, then
          administrative details.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Split a long form into <code>SectionCard</code> blocks rather than one card with twenty
          fields.
        </Typography>
      </li>
    </ul>

    <Typography variant="h6" gutterBottom>
      Don&apos;t
    </Typography>
    <ul>
      <li>
        <Typography variant="body2">
          Put labels in a left-hand column beside their fields; the pairing breaks the moment a
          label wraps.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Build a multi-step wizard before a screen needs one. <code>Stepper</code> is themed, but
          no product form requires it yet.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Auto-save a form field by field. The API validates a whole resource, so partial saves have
          nothing coherent to validate.
        </Typography>
      </li>
    </ul>
  </DocSection>
);

export default FormLayout;
