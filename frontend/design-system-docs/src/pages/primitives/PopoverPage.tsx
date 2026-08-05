import { useState, MouseEvent } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Popover from '@mui/material/Popover';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import { DocSection } from '../../components/DocLayout';
import CodeBlock from '../../components/CodeBlock';
import LivePreview from '../../components/LivePreview';
import SpecTable from '../../components/SpecTable';

const overrides = [
  [
    <code key="k">elevation</code>,
    <code key="v">0</code>,
    'The surface is flat with a hairline border; the Paper override already carries the brand shadow',
  ],
  [
    <code key="k">border</code>,
    <code key="v">{'1px solid divider'}</code>,
    'Same edge as the Menu paper, so the two overlays read as one family',
  ],
  [
    <code key="k">padding</code>,
    <code key="v">{'theme.spacing(2)'}</code>,
    'A floating panel is not a card — Paper’s 28px is right for a page section, not for a control',
  ],
  [
    <code key="k">backgroundImage</code>,
    <code key="v">none</code>,
    'Drops MUI’s dark-mode elevation tint, which would lift the surface off background.paper',
  ],
];

const choosing = [
  [
    <code key="k">Tooltip</code>,
    'A label for a control that has no visible text',
    'No focusable content — it is announced, not entered',
  ],
  [
    <code key="k">Menu</code>,
    'A list of commands or options',
    'Arrow keys move between items; Escape closes',
  ],
  [
    <code key="k">Popover</code>,
    'A small piece of UI anchored to a control — filters, a colour picker, a mini form',
    'Holds focusable content that is not a list',
  ],
  [
    <code key="k">ConfirmDialog</code>,
    'A decision that must be answered',
    'Blocks the page and traps focus deliberately',
  ],
];

const PopoverPage = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const open = (event: MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const close = () => setAnchorEl(null);

  return (
    <DocSection
      id="popover"
      title="Popover"
      description="The anchored surface behind Menu — themed on its own for panels that are not a list of commands."
    >
      <Typography variant="body1" paragraph>
        <code>Popover</code> is the positioning primitive: it anchors a <code>Paper</code> to an
        element, mounts it in a portal and closes it on an outside click. <code>Menu</code> is a
        Popover with list semantics on top, and <code>Select</code> is a Menu. Reach for Popover
        directly only when the content is not a list — a filter panel above a{' '}
        <code>DataTable</code>, say. If every item in it is a command, it is a <code>Menu</code>,
        and a Menu gives you roving focus and type-ahead for free.
      </Typography>

      <SpecTable headers={['Surface', 'Use for', 'Interaction']} rows={choosing} />

      <Typography variant="h6" gutterBottom>
        What the override sets
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        The paper slot is shared: a Menu paper carries the Popover class too. The override
        therefore excludes <code>.MuiMenu-paper</code> and applies only to a Popover used on its
        own, leaving the Menu, Select and ProfileMenu surfaces exactly as the Menu and Paper
        overrides already settled them.
      </Typography>
      <SpecTable headers={['What', 'Value', 'Why']} rows={overrides} />

      <Typography variant="h6" gutterBottom>
        Anchored panel
      </Typography>
      <LivePreview>
        <Button variant="outlined" onClick={open}>
          Filters
        </Button>
        <Popover
          open={Boolean(anchorEl)}
          anchorEl={anchorEl}
          onClose={close}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        >
          <Stack direction="column" spacing={0.5} sx={{ minWidth: 200 }}>
            <Typography variant="subtitle2" mb={0.5}>
              Enrolment status
            </Typography>
            <FormControlLabel control={<Checkbox defaultChecked />} label="Active" />
            <FormControlLabel control={<Checkbox />} label="Suspended" />
            <FormControlLabel control={<Checkbox />} label="Transferred" />
          </Stack>
        </Popover>
      </LivePreview>
      <CodeBlock
        code={`const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

<Button onClick={(event) => setAnchorEl(event.currentTarget)}>
  {t('common.filters')}
</Button>
<Popover
  open={Boolean(anchorEl)}
  anchorEl={anchorEl}
  onClose={() => setAnchorEl(null)}
  anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
  transformOrigin={{ vertical: 'top', horizontal: 'left' }}
>
  <FilterFields />
</Popover>`}
      />
      <Typography variant="body2" color="text.secondary" mb={2}>
        <code>anchorOrigin</code> is the point on the anchor, <code>transformOrigin</code> the
        point on the popover that meets it. Pairing bottom-left with top-left is what makes a panel
        hang under its button and stay left-aligned with it; MUI&apos;s default pairs top-left with
        top-left, which covers the control that opened it.
      </Typography>

      <Typography variant="h6" gutterBottom>
        Do
      </Typography>
      <ul>
        <li>
          <Typography variant="body2">
            Keep the anchor rendered while the popover is open — it is the element the position and
            the returning focus are computed from.
          </Typography>
        </li>
        <li>
          <Typography variant="body2">
            Let the content size the panel, with a <code>minWidth</code> at most. A popover that
            scrolls internally wants to be a page.
          </Typography>
        </li>
        <li>
          <Typography variant="body2">
            Apply a filter panel&apos;s changes on close or on an explicit action, not on every
            keystroke against a paginated endpoint.
          </Typography>
        </li>
      </ul>

      <Typography variant="h6" gutterBottom>
        Don&apos;t
      </Typography>
      <ul>
        <li>
          <Typography variant="body2">
            Build a list of commands out of <code>Popover</code> plus buttons — that is a{' '}
            <code>Menu</code>, and rebuilding it loses keyboard navigation.
          </Typography>
        </li>
        <li>
          <Typography variant="body2">
            Nest a popover inside a popover. The second one is a step in a flow, so give it a
            dialog or a page.
          </Typography>
        </li>
        <li>
          <Typography variant="body2">
            Re-declare the border, radius or shadow at the call site; the theme owns the overlay
            surface.
          </Typography>
        </li>
      </ul>
    </DocSection>
  );
};

export default PopoverPage;
