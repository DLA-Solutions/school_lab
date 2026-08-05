import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { DocSection } from '../../components/DocLayout';
import CodeBlock from '../../components/CodeBlock';
import LivePreview from '../../components/LivePreview';
import SpecTable from '../../components/SpecTable';

const ratios = [
  ['1 / 1', 'Avatars, gallery thumbnails, square logos'],
  ['4 / 3', 'Photo cards and document previews'],
  ['16 / 9', 'Video, wide banners, embedded media'],
  ['21 / 9', 'Hero strips at the top of a page'],
];

const frameSx = {
  bgcolor: 'surface.alt',
  borderRadius: 2,
  display: 'grid',
  placeItems: 'center',
  width: 1,
} as const;

const AspectRatio = () => (
  <DocSection
    id="ratio"
    title="Aspect ratio"
    description="Reserving a proportional box so content cannot shift the page as it loads."
  >
    <Typography variant="body1" paragraph>
      A box that must keep its proportions as the column resizes — a chart slot, a photo frame, an
      embedded map — declares <code>aspectRatio</code>. The browser computes the height from the
      width, so the space is reserved before the content arrives and the page never jumps.
    </Typography>
    <Typography variant="body1" paragraph>
      The old padding-top percentage hack is not needed. <code>aspect-ratio</code> is supported by
      every browser the product targets, and unlike the hack it composes with{' '}
      <code>objectFit</code>, flexbox and grid.
    </Typography>

    <SpecTable headers={['Ratio', 'Typical use']} rows={ratios} />

    <LivePreview>
      <Stack spacing={2} flexWrap="wrap" alignItems="flex-start">
        {ratios.map(([ratio]) => (
          <Box key={ratio} sx={{ width: 160 }}>
            <Box sx={{ ...frameSx, aspectRatio: ratio }}>
              <Typography variant="caption" color="text.secondary">
                {ratio}
              </Typography>
            </Box>
          </Box>
        ))}
      </Stack>
    </LivePreview>
    <CodeBlock
      code={`// A proportional frame
<Box sx={{ aspectRatio: '16 / 9', width: 1, borderRadius: 2, overflow: 'hidden' }}>
  <Image src={cover} alt={t('school.cover_alt')} sx={{ width: 1, height: 1, objectFit: 'cover' }} />
</Box>

// A chart slot that keeps its shape while data loads
<Box sx={{ aspectRatio: '4 / 3' }}>
  {isLoading ? <Skeleton variant="rectangular" height="100%" /> : <ReactEchart option={option} />}
</Box>`}
    />

    <Typography variant="h6" gutterBottom>
      Do
    </Typography>
    <ul>
      <li>
        <Typography variant="body2">
          Let width come from the layout and height from the ratio — set one dimension, never both.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Combine the frame with <code>objectFit: &apos;cover&apos;</code> so images crop instead of
          stretching.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Use the same ratio for every card in a list; mismatched frames read as misalignment.
        </Typography>
      </li>
    </ul>

    <Typography variant="h6" gutterBottom>
      Don&apos;t
    </Typography>
    <ul>
      <li>
        <Typography variant="body2">
          Reintroduce the <code>padding-top</code> percentage hack or a wrapper with an absolutely
          positioned child.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Put a ratio on a box whose content decides the height — text will overflow or be clipped.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Fix a pixel height to approximate a ratio; it breaks at the next breakpoint.
        </Typography>
      </li>
    </ul>
  </DocSection>
);

export default AspectRatio;
