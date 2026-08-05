import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { DocSection } from '../../components/DocLayout';
import CodeBlock from '../../components/CodeBlock';
import LivePreview from '../../components/LivePreview';

const longText =
  'Maria Eduarda dos Santos Albuquerque — Guardian responsible for tuition and daily routine notices';

const clampSx = {
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 2,
  overflow: 'hidden',
} as const;

const Truncation = () => (
  <DocSection
    id="truncation"
    title="Text truncation"
    description="Clipping long strings without hiding information the user needs."
  >
    <Typography variant="body1" paragraph>
      Names, addresses and message previews arrive from the API at any length. Truncation is a layout
      decision, so it lives in <code>sx</code> — but it removes information from the screen, so it
      always comes with a way to recover it: a tooltip, a detail page, or a cell the grid can expand.
    </Typography>

    <Typography variant="h6" gutterBottom>
      Single line
    </Typography>
    <Typography variant="body2" color="text.secondary" mb={2}>
      <code>noWrap</code> on <code>Typography</code> applies the whole ellipsis recipe. Pair it with a
      tooltip whenever the full value matters.
    </Typography>
    <LivePreview>
      <Stack direction="column" spacing={2}>
        <Box sx={{ maxWidth: 320 }}>
          <Typography noWrap>{longText}</Typography>
        </Box>
        <Box sx={{ maxWidth: 320 }}>
          <Tooltip title={longText}>
            <Typography noWrap>{longText}</Typography>
          </Tooltip>
        </Box>
      </Stack>
    </LivePreview>
    <CodeBlock
      code={`<Tooltip title={guardian.name}>
  <Typography noWrap>{guardian.name}</Typography>
</Tooltip>`}
    />

    <Typography variant="h6" gutterBottom>
      Several lines
    </Typography>
    <Typography variant="body2" color="text.secondary" mb={2}>
      For previews — a message excerpt, a description — clamp to a line count instead. The recipe is
      four declarations and is best hoisted into a constant next to the component that uses it.
    </Typography>
    <LivePreview>
      <Box sx={{ maxWidth: 320 }}>
        <Typography sx={clampSx}>{longText}</Typography>
      </Box>
    </LivePreview>
    <CodeBlock
      code={`const clampSx = {
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 2,
  overflow: 'hidden',
} as const;

<Typography sx={clampSx}>{message.preview}</Typography>`}
    />

    <Typography variant="h6" gutterBottom>
      Truncating inside a flex row
    </Typography>
    <Typography variant="body2" color="text.secondary" mb={2}>
      This is the failure everyone hits once: a truncated element inside a <code>Stack</code> refuses
      to shrink and pushes the row wider instead. A flex item&apos;s minimum size defaults to its
      content, so the shrinking item needs <code>minWidth: 0</code>.
    </Typography>
    <LivePreview>
      <Stack spacing={2} alignItems="center" sx={{ maxWidth: 360 }}>
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography noWrap>{longText}</Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
          12/03
        </Typography>
      </Stack>
    </LivePreview>
    <CodeBlock
      code={`<Stack spacing={2} alignItems="center">
  <Box sx={{ minWidth: 0, flexGrow: 1 }}>
    <Typography noWrap>{message.subject}</Typography>
  </Box>
  <Typography variant="caption" sx={{ flexShrink: 0 }}>{date}</Typography>
</Stack>`}
    />

    <Typography variant="h6" gutterBottom>
      Do
    </Typography>
    <ul>
      <li>
        <Typography variant="body2">
          Bound the width of the container, not the number of characters — never slice a string in
          JavaScript to make it fit.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Leave the full value in the DOM so it stays selectable and readable by assistive technology.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Give grid columns <code>flex</code> and let <code>DataTable</code> handle the cell ellipsis.
        </Typography>
      </li>
    </ul>

    <Typography variant="h6" gutterBottom>
      Don&apos;t
    </Typography>
    <ul>
      <li>
        <Typography variant="body2">
          Truncate a value the user must act on — an amount, a due date, a status.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Clamp text without a route to the full content; a preview with no detail view hides data.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Add <code>overflow: hidden</code> to a whole card to solve one overflowing child — it clips
          focus rings and shadows too.
        </Typography>
      </li>
    </ul>
  </DocSection>
);

export default Truncation;
