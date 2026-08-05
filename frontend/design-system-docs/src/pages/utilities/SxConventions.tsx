import Typography from '@mui/material/Typography';
import { DocSection } from '../../components/DocLayout';
import CodeBlock from '../../components/CodeBlock';
import SpecTable from '../../components/SpecTable';

const escalation = [
  [
    'Once, on one screen',
    <code key="v">sx</code>,
    'A layout tweak that belongs to that composition and nothing else',
  ],
  [
    'Repeated inside one component',
    'A local style object',
    'Declare it above the component and reuse it — still local, no indirection',
  ],
  [
    'Repeated across screens, same shape',
    <code key="v">design-system/</code>,
    'It is a pattern component; extract on the third stable case, not the second',
  ],
  [
    'Every instance of a primitive',
    <code key="v">theme/components/</code>,
    'It is the primitive\u2019s appearance — make it the default so nobody restates it',
  ],
];

const shorthands = [
  [<code key="k">p, px, py, m, mt…</code>, <code key="v">p: 2</code>, '16px — multiples of the 8px unit'],
  [<code key="k">bgcolor</code>, <code key="v">bgcolor: &apos;surface.alt&apos;</code>, 'Palette path, never a hex'],
  [<code key="k">color</code>, <code key="v">color: &apos;text.secondary&apos;</code>, 'Palette path'],
  [<code key="k">borderRadius</code>, <code key="v">borderRadius: 2</code>, '8px — multiples of shape.borderRadius'],
  [<code key="k">width, height</code>, <code key="v">width: 1</code>, '100% — fractions mean percentages'],
  [
    <code key="k">boxShadow</code>,
    <code key="v">boxShadow: 1</code>,
    'Index into theme.shadows — customShadows is a separate array',
  ],
];

const SxConventions = () => (
  <DocSection
    id="sx"
    title="sx conventions"
    description="The sanctioned styling escape hatch — and the rules that keep it from becoming a stylesheet."
  >
    <Typography variant="body1" paragraph>
      There is no utility class system in this stack, and there will not be one. <code>sx</code> is
      the styling escape hatch: it is scoped to the element, reads the theme, and disappears with the
      component. What it must not become is a place where the design system is re-decided one page at
      a time.
    </Typography>

    <Typography variant="h6" gutterBottom>
      Where a style belongs
    </Typography>
    <Typography variant="body2" color="text.secondary" mb={2}>
      The question is never &quot;can I write this in sx?&quot; but &quot;how many places need
      it?&quot;. Escalate only when the answer changes.
    </Typography>
    <SpecTable headers={['The style appears…', 'Put it in', 'Why']} rows={escalation} />

    <Typography variant="h6" gutterBottom>
      Speak in theme units
    </Typography>
    <Typography variant="body2" color="text.secondary" mb={2}>
      Every numeric shorthand resolves through the theme, which is what keeps a page consistent
      without repeating values. A raw pixel string is a value that stopped participating in the
      system.
    </Typography>
    <SpecTable headers={['Shorthand', 'Example', 'Resolves to']} rows={shorthands} />
    <CodeBlock
      code={`// Reads the theme
<Box sx={{ p: 2, bgcolor: 'surface.alt', borderRadius: 2, color: 'text.secondary' }} />

// Does not
<Box sx={{ padding: '16px', backgroundColor: 'rgb(11 23 57)', borderRadius: '8px' }} />`}
    />

    <Typography variant="h6" gutterBottom>
      The callback form
    </Typography>
    <Typography variant="body2" color="text.secondary" mb={2}>
      Use the function form when a value has to be computed from the theme — a z-index layer, a
      breakpoint helper, or a per-scheme literal through <code>applyStyles</code>. Prefer the string
      path when one exists; the callback is heavier to read.
    </Typography>
    <CodeBlock
      code={`sx={(theme) => ({
  zIndex: theme.zIndex.appBar,
  [theme.breakpoints.up('lg')]: { px: 5 },
  ...theme.applyStyles('light', { boxShadow: theme.customShadows[1] }),
})}`}
    />

    <Typography variant="h6" gutterBottom>
      Do
    </Typography>
    <ul>
      <li>
        <Typography variant="body2">
          Keep <code>sx</code> to layout and spacing — position, size, gap, alignment. Appearance is
          the theme&apos;s job.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Use responsive object values (<code>{'{ xs: 2, lg: 5 }'}</code>) instead of media queries.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Hoist a style object out of the render body when it does not depend on props, so it is not
          rebuilt every render.
        </Typography>
      </li>
    </ul>

    <Typography variant="h6" gutterBottom>
      Don&apos;t
    </Typography>
    <ul>
      <li>
        <Typography variant="body2">
          Write a hex colour. Outside <code>packages/design-tokens</code> and{' '}
          <code>theme/mapTokensToPalette.ts</code>, there are no literal colours.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Reach into another component&apos;s internals with a class selector such as{' '}
          <code>&apos;& .MuiButton-root&apos;</code> from a page. If a primitive needs to look
          different everywhere, change its override.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Recreate a pattern component with <code>sx</code> — a bordered box with a title is a{' '}
          <code>SectionCard</code>.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Build a set of reusable class-like style constants shared across features; that is a
          utility system by another name.
        </Typography>
      </li>
    </ul>
  </DocSection>
);

export default SxConventions;
