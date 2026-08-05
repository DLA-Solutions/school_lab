import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { fontFamily } from 'theme/typography';
import { DocSection } from '../components/DocLayout';
import CodeBlock from '../components/CodeBlock';
import SpecTable from '../components/SpecTable';

const variants = [
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'subtitle1',
  'subtitle2',
  'body1',
  'body2',
  'caption',
  'button',
] as const;

const scale = [
  [<code key="k">h1</code>, '3rem / 700', <code key="e">h1</code>, 'Reserved — nothing in the shell is this large except the 404 numeral'],
  [<code key="k">h2</code>, '2.25rem / 700', <code key="e">h2</code>, 'Standalone pages outside the shell'],
  [<code key="k">h3</code>, '1.75rem / 700', <code key="e">h3</code>, 'KPI and headline figures, usually at weight 600'],
  [<code key="k">h4</code>, '1.5rem / 700', <code key="e">h4</code>, 'Catalog page titles'],
  [<code key="k">h5</code>, '1.25rem / 700', <code key="e">h5</code>, 'Product wordmark in the sidebar and the topbar page title'],
  [<code key="k">h6</code>, '1.125rem / 700', <code key="e">h6</code>, 'Section and card titles, via PageHeader and SectionCard'],
  [<code key="k">subtitle1</code>, '1rem / 400', <code key="e">p</code>, 'Lead text and EmptyState titles'],
  [<code key="k">subtitle2</code>, '0.875rem / 500', <code key="e">p</code>, 'Labels above a figure; the user name in ProfileMenu'],
  [<code key="k">body1</code>, '1rem / 400', <code key="e">p</code>, 'Default body copy'],
  [<code key="k">body2</code>, '0.875rem / 400', <code key="e">p</code>, 'Dense UI text — table cells, helper text, footers'],
  [<code key="k">caption</code>, '0.75rem / 600', <code key="e">span</code>, 'Column headers and metadata; heavier than MUI’s caption on purpose'],
  [<code key="k">button</code>, '1rem / 500', <code key="e">span</code>, 'Applied by Button; not for prose'],
];

const overrides = [
  [
    <code key="k">variantMapping</code>,
    <span key="v">
      <code>subtitle1</code> and <code>subtitle2</code> render as <code>p</code>
    </span>,
    'MUI maps both to h6, so every subtitle entered the accessibility tree as a heading',
  ],
  [
    <code key="k">gutterBottom</code>,
    <code key="v">{'marginBottom: theme.spacing(1)'}</code>,
    'MUI’s 0.35em changes with the font size; vertical rhythm comes from the 8px scale',
  ],
];

const TypographyPage = () => (
  <DocSection
    id="typography"
    title="Typography"
    description="One scale, two families, and the variant-to-element mapping that keeps the document outline honest."
  >
    <Typography variant="body1" paragraph>
      Mona Sans is the default family for the whole app. Work Sans is the exception, opted into per
      call through <code>fontFamily.workSans</code> for dashboard section titles and chart legends,
      where the lighter face reads better at weight 400. Neither is set through CSS on raw
      elements: the MUI variants <em>are</em> the scale, so a size that is not in the table below
      does not exist.
    </Typography>

    <SpecTable headers={['Variant', 'Size / weight', 'Renders as', 'Use for']} rows={scale} />

    <Typography variant="h6" gutterBottom>
      Specimen
    </Typography>
    <Typography variant="body2" color="text.secondary" mb={2}>
      As the theme renders them, with no per-call overrides.
    </Typography>
    <Stack direction="column" spacing={2} mb={3}>
      {variants.map((variant) => (
        <Typography key={variant} variant={variant}>
          {variant} — The quick brown fox
        </Typography>
      ))}
    </Stack>

    <Typography variant="h6" gutterBottom>
      Work Sans
    </Typography>
    <Typography variant="body2" color="text.secondary" mb={2}>
      Section titles in the dashboard pair <code>h6</code> with weight 400 and Work Sans. The
      pattern components already do this, so a page that uses <code>PageHeader</code> and{' '}
      <code>SectionCard</code> never sets a family by hand.
    </Typography>
    <Stack direction="column" spacing={2} mb={2}>
      <Typography variant="h6" fontWeight={400} fontFamily={fontFamily.workSans}>
        Website Visitors — h6, weight 400, Work Sans
      </Typography>
      <Typography variant="body1" fontFamily={fontFamily.workSans} color="text.secondary">
        body1 in Work Sans — chart legends and figure labels
      </Typography>
    </Stack>
    <CodeBlock
      code={`import { fontFamily } from 'theme/typography';

<Typography variant="h6" fontWeight={400} fontFamily={fontFamily.workSans}>
  {t('dashboard.visitors')}
</Typography>`}
    />

    <Typography variant="h6" gutterBottom>
      What the override sets
    </Typography>
    <Typography variant="body2" color="text.secondary" mb={2}>
      The scale itself lives in <code>theme/typography.ts</code>. The{' '}
      <code>MuiTypography</code> override in <code>theme/components/data-display/</code> is
      narrower: it corrects the element a variant renders as, and ties the gutter to the spacing
      scale. It sets no colour — a <code>Typography</code> inherits from its surface, which is what
      lets the same component read correctly inside a Button, a Chip and a Tooltip.
    </Typography>
    <SpecTable headers={['What', 'Value', 'Why']} rows={overrides} />
    <Typography variant="body2" color="text.secondary" mb={2}>
      Only the two subtitles are remapped. Every other variant keeps MUI&apos;s element, and{' '}
      <code>component</code> still wins at the call site when a subtitle genuinely is a heading.
    </Typography>
    <CodeBlock
      code={`// Size and semantics are separate decisions.
<Typography variant="subtitle1">Lead paragraph</Typography>          // <p>
<Typography variant="subtitle1" component="h2">Section</Typography>  // <h2>, same size`}
    />

    <Typography variant="h6" gutterBottom>
      Do
    </Typography>
    <ul>
      <li>
        <Typography variant="body2">
          Pick the variant for its meaning, then correct the element with <code>component</code> if
          the outline needs a different one.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Let the surface own the colour, and reach for <code>color=&quot;text.secondary&quot;</code>{' '}
          only to demote text within it.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Use <code>noWrap</code> with a <code>title</code>, or the truncation utility, when text
          shares a row with a control.
        </Typography>
      </li>
    </ul>

    <Typography variant="h6" gutterBottom>
      Don&apos;t
    </Typography>
    <ul>
      <li>
        <Typography variant="body2">
          Set <code>fontSize</code> to reach a size between two variants. Either the scale is wrong
          for everyone, or the design is.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Skip heading levels to get a smaller heading — that is what{' '}
          <code>variant</code> plus <code>component</code> is for.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Apply Work Sans to body copy. It marks dashboard titles and figures, and stops meaning
          anything if it is everywhere.
        </Typography>
      </li>
    </ul>
  </DocSection>
);

export default TypographyPage;
