import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { visuallyHidden } from '@mui/utils';
import IconifyIcon from 'components/base/IconifyIcon';
import { DocSection } from '../../components/DocLayout';
import CodeBlock from '../../components/CodeBlock';
import LivePreview from '../../components/LivePreview';
import SpecTable from '../../components/SpecTable';

const techniques = [
  [
    <code key="k">aria-label</code>,
    'A control whose only content is an icon',
    'Shortest path — no extra element in the tree',
  ],
  [
    'Visually hidden text',
    'A label that must also be selectable, translatable or announced inline',
    'Real text nodes; survives copy, translation and reading order',
  ],
  [
    <code key="k">display: none</code>,
    'Content nobody should reach',
    'Removed from the accessibility tree — never use it for labels',
  ],
];

const VisuallyHidden = () => (
  <DocSection
    id="visually-hidden"
    title="Visually hidden content"
    description="Text for screen readers that must not take up space on screen."
  >
    <Typography variant="body1" paragraph>
      Some information is obvious visually and invisible to assistive technology: an icon-only
      button, a chart that a sighted user reads at a glance, a table caption that the layout implies.
      Hiding it with <code>display: none</code> or <code>visibility: hidden</code> also removes it
      from the accessibility tree, which defeats the purpose. The visually-hidden pattern keeps the
      text in the tree while removing it from the page.
    </Typography>

    <SpecTable headers={['Technique', 'When', 'Why']} rows={techniques} />

    <Typography variant="h6" gutterBottom>
      The style object
    </Typography>
    <Typography variant="body2" color="text.secondary" mb={2}>
      Import it — do not retype it. <code>@mui/utils</code> is an explicit dependency of{' '}
      <code>frontend/main</code> and exports <code>visuallyHidden</code>, the same nine declarations
      MUI uses internally for its own accessible labels. Hand-rolling them is how one gets subtly
      wrong (using <code>width: 0</code>, for instance), which silently drops the text from some
      screen readers.
    </Typography>
    <CodeBlock code={`import { visuallyHidden } from '@mui/utils';`} />

    <Typography variant="h6" gutterBottom>
      A live usage
    </Typography>
    <Typography variant="body2" color="text.secondary" mb={2}>
      <code>layouts/main-layout/SkipLink.tsx</code> is the shell&apos;s &quot;Skip to main
      content&quot; link and the pattern&apos;s canonical use in this SPA: hidden until it takes
      focus, then unhidden by overriding the declarations that put it out of the flow. It is the
      first focusable element of every page, so a keyboard user can jump the 300px sidebar.
    </Typography>
    <CodeBlock
      code={`import { visuallyHidden } from '@mui/utils';

<Link
  component="a"
  href={\`#\${targetId}\`}
  sx={{
    ...visuallyHidden,
    '&:focus': {
      clip: 'auto',
      height: 'auto',
      width: 'auto',
      margin: 0,
      overflow: 'visible',
      position: 'fixed',
      top: 16,
      left: 16,
      zIndex: 'tooltip',
      px: 2,
      py: 1,
      borderRadius: 1,
      typography: 'button',
      color: 'text.primary',
      bgcolor: 'background.paper',
      boxShadow: 3,
    },
  }}
>
  {children}
</Link>`}
    />

    <Typography variant="h6" gutterBottom>
      Icon-only controls
    </Typography>
    <Typography variant="body2" color="text.secondary" mb={2}>
      An <code>IconButton</code> with no accessible name is announced as &quot;button&quot;. Prefer{' '}
      <code>aria-label</code> here; reach for hidden text only when the label has to be part of the
      document content.
    </Typography>
    <LivePreview>
      <Stack spacing={2} alignItems="center">
        <IconButton aria-label="Delete student record">
          <IconifyIcon icon="material-symbols:delete-outline" />
        </IconButton>
        <IconButton>
          <IconifyIcon icon="material-symbols:edit-outline" />
          <Box component="span" sx={visuallyHidden}>
            Edit student record
          </Box>
        </IconButton>
      </Stack>
    </LivePreview>
    <CodeBlock
      code={`import { visuallyHidden } from '@mui/utils';

<IconButton aria-label={t('students.actions.delete')}>
  <IconifyIcon icon="material-symbols:delete-outline" />
</IconButton>

<Button>
  <IconifyIcon icon="material-symbols:download" />
  <Box component="span" sx={visuallyHidden}>{t('reports.download')}</Box>
</Button>`}
    />

    <Typography variant="h6" gutterBottom>
      Do
    </Typography>
    <ul>
      <li>
        <Typography variant="body2">
          Give every icon-only control an accessible name, from an i18n key like any other string.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Describe the action, not the icon — &quot;Delete student record&quot;, not &quot;trash
          icon&quot;.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Hide decorative icons from assistive technology with <code>aria-hidden</code> when the
          adjacent text already names the control.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Import <code>visuallyHidden</code> from <code>@mui/utils</code> rather than re-declaring
          the object next to each component that needs it.
        </Typography>
      </li>
    </ul>

    <Typography variant="h6" gutterBottom>
      Don&apos;t
    </Typography>
    <ul>
      <li>
        <Typography variant="body2">
          Use <code>display: none</code>, <code>visibility: hidden</code> or zero dimensions to hide
          a label; all three remove it from the accessibility tree.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Move content off-screen with a large negative offset — it can be reached by keyboard and
          scrolls the viewport when focused.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Hide text that a sighted user also needs. If it matters, make room for it.
        </Typography>
      </li>
    </ul>
  </DocSection>
);

export default VisuallyHidden;
