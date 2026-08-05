import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import FilledInput from '@mui/material/FilledInput';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import FormHelperText from '@mui/material/FormHelperText';
import { DocSection } from '../../components/DocLayout';
import CodeBlock from '../../components/CodeBlock';
import LivePreview from '../../components/LivePreview';
import SpecTable from '../../components/SpecTable';

const inventory = [
  [
    <code key="k">TextField</code>,
    'Text entry',
    'Adds the small elevation shadow — only on TextField, not on a hand-composed FormControl',
  ],
  [
    <code key="k">InputBase</code>,
    'Every input, indirectly',
    'The field box itself — border, radius, paper background, 10px padding, placeholder colour',
  ],
  [
    <code key="k">FilledInput</code>,
    'The default field variant',
    'Zeroes the built-in input padding so InputBase owns the box',
  ],
  [
    <code key="k">OutlinedInput</code>,
    'Rarely — see below',
    'Same padding reset as FilledInput',
  ],
  [
    <code key="k">InputAdornment</code>,
    'Icons and units inside a field',
    'Secondary colour, no margin, side padding only',
  ],
  [<code key="k">FormControl</code>, 'Wrapper for a labelled field', 'Filled by default; 6px column gap'],
  [<code key="k">FormLabel</code>, 'The label above a control', 'Label typography and its error/disabled colours'],
  [<code key="k">InputLabel</code>, 'The label of an input', 'Pinned above the field — never floats into it'],
  [
    <code key="k">FormHelperText</code>,
    'Hint and error text',
    'Caption size, secondary colour, error.main when Mui-error',
  ],
  [
    <code key="k">FormControlLabel</code>,
    'Checkbox / radio / switch rows',
    'Body2 secondary label, aligned with the control',
  ],
  [<code key="k">Checkbox</code>, 'Multi-select and consent', 'Custom blank, checked and indeterminate icons'],
  [<code key="k">Radio</code>, 'One of a small set', 'Secondary colour, icon sized off the type scale'],
  [<code key="k">Switch</code>, 'Immediate on/off', 'Primary track and thumb when on, neutral track when off'],
  [<code key="k">Select</code>, 'One of a known list', 'Chevron in the secondary colour'],
  [<code key="k">Autocomplete</code>, 'One of a long list', 'Popup paper and listbox matched to the Menu surface'],
];

const Overview = () => (
  <DocSection
    id="forms-overview"
    title="Forms"
    description="Fifteen themed primitives, one field anatomy, and an API that owns every rule."
  >
    <Typography variant="body1" paragraph>
      Forms are where the SPA&apos;s thin-client stance is easiest to break. A form looks like a
      place to put rules — a minimum age, a due date that cannot fall on a weekend, a plan that only
      certain roles may assign — and every one of those belongs to a service object in{' '}
      <code>web/</code>, not to a React component. The design system gives you the field vocabulary;{' '}
      the <code>Validation</code> page gives you the contract for what the client is allowed to
      decide on its own, which is very little.
    </Typography>

    <Typography variant="h6" gutterBottom>
      What the theme covers
    </Typography>
    <Typography variant="body2" color="text.secondary" mb={2}>
      These are the overrides that exist in <code>theme/components/input/</code> today. A primitive
      that is not on this list is unthemed, and using it means deciding its appearance in a feature
      page — which is how a design system erodes.
    </Typography>
    <SpecTable headers={['Primitive', 'Used for', 'What the override does']} rows={inventory} />

    <Typography variant="h6" gutterBottom>
      Anatomy of a field
    </Typography>
    <Typography variant="body2" color="text.secondary" mb={2}>
      A labelled field is four elements in a column: the control wrapper, the label, the input and
      the helper text. <code>TextField</code> composes all four for you; reach for the parts
      directly only when the control is a <code>Select</code>, a radio group, or something{' '}
      <code>TextField</code> does not wrap.
    </Typography>
    <LivePreview>
      <Stack direction="column" spacing={3} maxWidth={360}>
        <TextField
          variant="filled"
          size="small"
          label="Student name"
          placeholder="Full name"
          helperText="As it appears on the enrolment record"
          fullWidth
        />
        <FormControl size="small" fullWidth>
          <FormLabel htmlFor="overview-notes">Notes</FormLabel>
          <FilledInput id="overview-notes" multiline minRows={2} />
          <FormHelperText>Visible to school staff only</FormHelperText>
        </FormControl>
      </Stack>
    </LivePreview>
    <CodeBlock
      code={`<TextField
  variant="filled"
  size="small"
  label={t('students.fields.name')}
  helperText={t('students.hints.name')}
  fullWidth
/>`}
    />

    <Typography variant="h6" gutterBottom>
      Two decisions the theme already made
    </Typography>
    <Typography variant="body2" color="text.secondary" mb={1}>
      <strong>Fields are filled.</strong> <code>InputBase</code> paints the field&apos;s border,
      radius and background itself. The outlined variant draws a second border — its notched
      fieldset — on top of that one, so <code>variant=&quot;filled&quot;</code> is the design-system
      field. <code>FormControl</code> defaults to it; <code>TextField</code> defaults to{' '}
      <code>outlined</code> upstream and has to be told.
    </Typography>
    <Typography variant="body2" color="text.secondary" mb={2}>
      <strong>Labels do not float.</strong> The <code>FilledInput</code> and{' '}
      <code>OutlinedInput</code> overrides zero the inner padding MUI reserves for an animated
      label, so a floating label would land on top of the value. <code>InputLabel</code> is pinned
      above the field instead. You get the label position for free; you do not get to re-enable the
      animation on one screen.
    </Typography>

    <Typography variant="h6" gutterBottom>
      Do
    </Typography>
    <ul>
      <li>
        <Typography variant="body2">
          Pass <code>variant=&quot;filled&quot;</code> and <code>size=&quot;small&quot;</code> to{' '}
          <code>TextField</code> — that combination is what the sign-in form and{' '}
          <code>SearchField</code> already render.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Give every control a label, from an i18n key. A placeholder is a hint, not a label: it
          disappears the moment someone types.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Let the API decide. A form&apos;s job is to collect input, show what the server said, and
          stay out of the way.
        </Typography>
      </li>
    </ul>

    <Typography variant="h6" gutterBottom>
      Don&apos;t
    </Typography>
    <ul>
      <li>
        <Typography variant="body2">
          Restate a business rule in the browser. See <code>Validation</code> for where the line
          sits.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Introduce a form library before a screen needs one. Controlled state in the page component
          is enough for the forms the product has today.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Restyle a field with <code>sx</code>. If every field should look different, the override
          is wrong — change it there.
        </Typography>
      </li>
    </ul>
  </DocSection>
);

export default Overview;
