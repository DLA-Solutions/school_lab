import { useState } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import Checkbox from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import FormHelperText from '@mui/material/FormHelperText';
import FormLabel from '@mui/material/FormLabel';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Select from '@mui/material/Select';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import { DocSection } from '../../components/DocLayout';
import CodeBlock from '../../components/CodeBlock';
import LivePreview from '../../components/LivePreview';
import SpecTable from '../../components/SpecTable';

const choosing = [
  [
    <code key="k">Checkbox</code>,
    'Zero or more from a short list; a single consent',
    'Applies on submit, with the rest of the form',
  ],
  [
    <code key="k">Radio</code>,
    'Exactly one from two to five visible options',
    'Applies on submit; every option stays readable',
  ],
  [
    <code key="k">Switch</code>,
    'A setting that takes effect immediately',
    'Applies on toggle — if it needs a Save button, it is a checkbox',
  ],
  [
    <code key="k">Select</code>,
    'Exactly one from a known, closed list',
    'Applies on submit; the list fits in a menu without scrolling far',
  ],
  [
    <code key="k">Autocomplete</code>,
    'One from a list long enough to need typing',
    'Applies on submit; options come from the API, filtered server-side when the list is paginated',
  ],
];

const grouping = [
  [<code key="k">FormControl</code>, 'The wrapper', 'Owns the error and disabled state for the whole group'],
  [<code key="k">FormLabel</code>, 'The group question', 'One label for the set, not one per option'],
  [<code key="k">RadioGroup</code>, 'Single choice', 'Gives the options a shared name and arrow-key navigation'],
  [<code key="k">FormGroup</code>, 'Multiple choice', 'Layout only — each checkbox owns its own state'],
  [<code key="k">FormHelperText</code>, 'Hint or error', 'One message for the group; turns error.main with Mui-error'],
];

const schools = ['Colégio Aurora', 'Escola Vale Verde', 'Instituto Nova Era'];

const Selection = () => {
  const [status, setStatus] = useState('active');
  const [plan, setPlan] = useState('monthly');

  return (
    <DocSection
      id="forms-selection"
      title="Selection controls"
      description="Checkbox, radio, switch, select and autocomplete — and how to tell them apart."
    >
      <Typography variant="body1" paragraph>
        Selection controls differ less in appearance than in <em>when the choice takes effect</em>.
        A switch changes something now; a checkbox changes something when the form is submitted.
        Picking the wrong one is the most common form bug in an admin product, because both render
        as a small toggle next to a label and only one of them is honest about what it did.
      </Typography>

      <SpecTable headers={['Control', 'Use when', 'Commit behaviour']} rows={choosing} />

      <Typography variant="h6" gutterBottom>
        Single option and consent
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        <code>FormControlLabel</code> is the row: it pairs the control with its text, aligns them
        and applies the label typography. Never place a bare <code>Checkbox</code> next to a{' '}
        <code>Typography</code> — the text stops being a click target and the control loses its
        accessible name.
      </Typography>
      <LivePreview>
        <Stack direction="column" spacing={1}>
          <FormControlLabel control={<Checkbox defaultChecked />} label="Remember me" />
          <FormControlLabel control={<Switch defaultChecked />} label="Notify guardians by push" />
          <FormControlLabel control={<Switch />} label="Weekly digest e-mail" />
        </Stack>
      </LivePreview>

      <Typography variant="h6" gutterBottom>
        Grouped choices
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        A group of options is one question, so it gets one label and one helper message. The parts
        below are what makes that work — and what makes an error on the group land in the right
        place.
      </Typography>
      <SpecTable headers={['Part', 'Role', 'Why']} rows={grouping} />
      <LivePreview>
        <Stack direction="row" spacing={6} flexWrap="wrap">
          <FormControl>
            <FormLabel id="plan-label">Billing cycle</FormLabel>
            <RadioGroup
              aria-labelledby="plan-label"
              value={plan}
              onChange={(event) => setPlan(event.target.value)}
            >
              <FormControlLabel value="monthly" control={<Radio />} label="Monthly" />
              <FormControlLabel value="yearly" control={<Radio />} label="Yearly" />
            </RadioGroup>
            <FormHelperText>Changes apply from the next invoice</FormHelperText>
          </FormControl>

          <FormControl error>
            <FormLabel>Guardian channels</FormLabel>
            <FormGroup>
              <FormControlLabel control={<Checkbox />} label="Push" />
              <FormControlLabel control={<Checkbox />} label="E-mail" />
              <FormControlLabel control={<Checkbox />} label="SMS" />
            </FormGroup>
            <FormHelperText>Select at least one channel</FormHelperText>
          </FormControl>
        </Stack>
      </LivePreview>
      <CodeBlock
        code={`<FormControl error={Boolean(errors.channels)}>
  <FormLabel>{t('communication.fields.channels')}</FormLabel>
  <FormGroup>
    {channels.map((channel) => (
      <FormControlLabel
        key={channel}
        control={<Checkbox checked={selected.includes(channel)} onChange={toggle(channel)} />}
        label={t(\`communication.channels.\${channel}\`)}
      />
    ))}
  </FormGroup>
  {errors.channels && <FormHelperText>{errors.channels}</FormHelperText>}
</FormControl>`}
      />

      <Typography variant="h6" gutterBottom>
        Select
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        <code>Select</code> needs its own <code>FormControl</code> and <code>InputLabel</code>;
        unlike <code>TextField</code> it does not compose them. The label is pinned above the field
        by the <code>InputLabel</code> override, so no <code>notched</code> or <code>shrink</code>{' '}
        juggling is required at the call site.
      </Typography>
      <LivePreview>
        <FormControl size="small" sx={{ minWidth: 240 }}>
          <InputLabel id="status-label">Enrolment status</InputLabel>
          <Select
            labelId="status-label"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="suspended">Suspended</MenuItem>
            <MenuItem value="transferred">Transferred</MenuItem>
          </Select>
          <FormHelperText>Set by the school secretariat</FormHelperText>
        </FormControl>
      </LivePreview>
      <CodeBlock
        code={`<FormControl size="small" fullWidth>
  <InputLabel id="status-label">{t('students.fields.status')}</InputLabel>
  <Select labelId="status-label" value={status} onChange={handleStatus}>
    {STATUSES.map((value) => (
      <MenuItem key={value} value={value}>
        {t(\`students.status.\${value}\`)}
      </MenuItem>
    ))}
  </Select>
</FormControl>`}
      />
      <Typography variant="body2" color="text.secondary" mb={2}>
        Option values are the API&apos;s enum values, in English. Only the visible text is
        translated — never send a pt-BR label back to the server.
      </Typography>

      <Typography variant="h6" gutterBottom>
        Autocomplete
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Once a list is long enough that scrolling a menu is worse than typing, switch to{' '}
        <code>Autocomplete</code>. Its <code>renderInput</code> must return the same filled, small{' '}
        <code>TextField</code> as everywhere else, otherwise it is the one field on the page with a
        different box.
      </Typography>
      <LivePreview>
        <Autocomplete
          options={schools}
          sx={{ maxWidth: 360 }}
          renderInput={(params) => (
            <TextField {...params} variant="filled" size="small" label="School" />
          )}
        />
      </LivePreview>
      <CodeBlock
        code={`<Autocomplete
  options={schools}
  getOptionLabel={(option) => option.name}
  isOptionEqualToValue={(option, value) => option.id === value.id}
  loading={isLoading}
  onInputChange={(_, term) => setSearch(term)}
  renderInput={(params) => (
    <TextField {...params} variant="filled" size="small" label={t('schools.one')} />
  )}
/>`}
      />
      <Typography variant="body2" color="text.secondary" mb={2}>
        When the options come from a paginated endpoint, filter on the server through{' '}
        <code>onInputChange</code>. Loading every page so the browser can filter is the same
        mistake as client-side table pagination.
      </Typography>

      <Typography variant="h6" gutterBottom>
        Do
      </Typography>
      <ul>
        <li>
          <Typography variant="body2">
            Give a group one <code>FormLabel</code> and wire it with <code>aria-labelledby</code> so
            the question is announced before the options.
          </Typography>
        </li>
        <li>
          <Typography variant="body2">
            Put the error on the <code>FormControl</code>, not on each option — the whole group is
            what failed.
          </Typography>
        </li>
        <li>
          <Typography variant="body2">
            Persist a switch immediately and show the result, including the failure. A switch that
            silently reverts is worse than a checkbox.
          </Typography>
        </li>
      </ul>

      <Typography variant="h6" gutterBottom>
        Don&apos;t
      </Typography>
      <ul>
        <li>
          <Typography variant="body2">
            Use a <code>Switch</code> inside a form with a Save button; the two disagree about when
            the change happened.
          </Typography>
        </li>
        <li>
          <Typography variant="body2">
            Offer a <code>Select</code> with two options — that is a radio pair, and it costs one
            fewer click.
          </Typography>
        </li>
        <li>
          <Typography variant="body2">
            Hide an option because the current role may not pick it. Authorization is enforced by
            Pundit in <code>web/</code>; the client may reflect it, never define it.
          </Typography>
        </li>
      </ul>
    </DocSection>
  );
};

export default Selection;
