import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { fontFamily } from 'theme/typography';
import { DocSection } from '../components/DocLayout';

const variants = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'subtitle1', 'subtitle2', 'body1', 'body2', 'caption', 'button'] as const;

const TypographyPage = () => (
  <DocSection id="typography" title="Typography" description="Mona Sans (default) and Work Sans (dashboard labels).">
    <Typography variant="body2" color="text.secondary" mb={2}>
      Work Sans is used for dashboard section titles via <code>fontFamily.workSans</code>.
    </Typography>
    <Stack spacing={2}>
      {variants.map((variant) => (
        <Typography
          key={variant}
          variant={variant}
          fontFamily={variant.startsWith('h') ? fontFamily.workSans : undefined}
        >
          {variant} — The quick brown fox
        </Typography>
      ))}
    </Stack>
  </DocSection>
);

export default TypographyPage;
