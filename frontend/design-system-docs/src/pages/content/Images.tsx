import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Image from 'components/base/Image';
import IconifyIcon from 'components/base/IconifyIcon';
import sampleImage from 'assets/images/AWS8.png';
import { DocSection } from '../../components/DocLayout';
import CodeBlock from '../../components/CodeBlock';
import LivePreview from '../../components/LivePreview';
import SpecTable from '../../components/SpecTable';

const choices = [
  [
    <code key="k">Image</code>,
    'components/base/Image',
    'Any content image — a thin Box with component="img" that accepts sx',
  ],
  [<code key="k">Avatar</code>, '@mui/material', 'People and entities, with initials as the fallback'],
  [
    <code key="k">IconifyIcon</code>,
    'components/base/IconifyIcon',
    'Icons — vector, colour-inheriting, never a raster asset',
  ],
];

const Images = () => (
  <DocSection
    id="images"
    title="Images"
    description="Images are fluid by default, framed by their container, and always described."
  >
    <Typography variant="body1" paragraph>
      There is no <code>img</code> override in the theme, because a bare <code>img</code> is never
      rendered directly. Content images go through <code>Image</code>, which is a{' '}
      <code>Box component=&quot;img&quot;</code> — that is what makes <code>sx</code>, and therefore
      theme spacing and radius, available on an image.
    </Typography>

    <SpecTable headers={['Use', 'From', 'For']} rows={choices} />

    <Typography variant="h6" gutterBottom>
      Fluid image
    </Typography>
    <Typography variant="body2" color="text.secondary" mb={2}>
      An image should never overflow its column. <code>width: 1</code> is the MUI shorthand for 100%;
      pairing it with <code>height: auto</code> preserves the intrinsic ratio, and{' '}
      <code>display: block</code> removes the inline-descender gap under the element.
    </Typography>
    <LivePreview>
      <Box sx={{ maxWidth: 320 }}>
        <Image
          src={sampleImage}
          alt="Illustration of a stacked storage graphic"
          sx={{ width: 1, height: 'auto', display: 'block', borderRadius: 2 }}
        />
      </Box>
    </LivePreview>
    <CodeBlock
      code={`import Image from 'components/base/Image';
import cover from 'assets/images/cover.png';

<Image
  src={cover}
  alt={t('students.photo_alt')}
  sx={{ width: 1, height: 'auto', display: 'block', borderRadius: 2 }}
/>`}
    />

    <Typography variant="h6" gutterBottom>
      Fixed frame
    </Typography>
    <Typography variant="body2" color="text.secondary" mb={2}>
      When the layout dictates the box — a card cover, a thumbnail in a table — fix the frame and let{' '}
      <code>objectFit: &apos;cover&apos;</code> crop. Never squeeze the image by setting both
      dimensions without it.
    </Typography>
    <LivePreview>
      <Stack spacing={2} alignItems="center">
        <Image
          src={sampleImage}
          alt="Thumbnail, cropped to a square frame"
          sx={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 2 }}
        />
        <Image
          src={sampleImage}
          alt="Thumbnail, contained in a square frame"
          sx={{
            width: 96,
            height: 96,
            objectFit: 'contain',
            borderRadius: 2,
            bgcolor: 'surface.alt',
          }}
        />
      </Stack>
    </LivePreview>
    <CodeBlock
      code={`// cover — fills the frame, crops the overflow
sx={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 2 }}

// contain — shows the whole image, pads with a surface token
sx={{ width: 96, height: 96, objectFit: 'contain', bgcolor: 'surface.alt' }}`}
    />

    <Typography variant="h6" gutterBottom>
      People and icons
    </Typography>
    <Typography variant="body2" color="text.secondary" mb={2}>
      <code>Avatar</code> owns the circular crop and the initials fallback, which matters when a
      guardian has no photo. Icons are never images: <code>IconifyIcon</code> renders vectors that
      inherit <code>color</code> and <code>fontSize</code>, so they follow the color scheme
      automatically.
    </Typography>
    <LivePreview>
      <Stack direction="row" spacing={2} alignItems="center">
        <Avatar src={sampleImage} alt="Sample avatar" />
        <Avatar>AS</Avatar>
        <IconifyIcon icon="material-symbols:image-outline" fontSize="h4.fontSize" />
      </Stack>
    </LivePreview>

    <Typography variant="h6" gutterBottom>
      Do
    </Typography>
    <ul>
      <li>
        <Typography variant="body2">
          Write a meaningful <code>alt</code> from an i18n key, or <code>alt=&quot;&quot;</code> when
          the image is purely decorative — an empty alt is a decision, a missing one is a bug.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Reserve the space an image will occupy, so the page does not shift when it loads.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Use <code>borderRadius</code> from the theme (<code>1</code> = 4px, <code>2</code> = 8px)
          rather than pixel values.
        </Typography>
      </li>
    </ul>

    <Typography variant="h6" gutterBottom>
      Don&apos;t
    </Typography>
    <ul>
      <li>
        <Typography variant="body2">
          Render a raw <code>&lt;img&gt;</code>; it cannot read the theme and escapes the sx contract.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Ship an icon as a PNG, or a decorative gradient as an image — the palette already carries
          gradient tokens.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Put a real student, guardian or staff photograph in a catalog example or a story. Catalog
          imagery is synthetic (LGPD).
        </Typography>
      </li>
    </ul>
  </DocSection>
);

export default Images;
