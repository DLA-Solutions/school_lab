import { ReactNode } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /**
   * Content of the tile above the title, `∅` by default. Decorative: it sits in an `aria-hidden`
   * container, so anything passed here must repeat nothing the title does not already say.
   */
  icon?: ReactNode;
}

// The title is a paragraph unless the caller asks for a heading. In the list-page composition the
// surrounding SectionCard already titles the region, so a second heading would duplicate it in the
// outline; when the empty state is the whole page body its title is the only landmark, and only
// the call site knows which level fits the page.
const EmptyState = ({
  title,
  description,
  action,
  headingLevel,
  icon = (
    <Typography variant="h5" color="text.secondary">
      ∅
    </Typography>
  ),
}: EmptyStateProps) => {
  return (
    <Stack alignItems="center" justifyContent="center" spacing={2} py={6} px={3}>
      <Box
        aria-hidden
        sx={{
          width: 48,
          height: 48,
          borderRadius: 2,
          bgcolor: 'surface.alt',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </Box>
      <Stack spacing={0.5} alignItems="center" textAlign="center">
        <Typography
          variant="subtitle1"
          color="text.primary"
          component={headingLevel ? (`h${headingLevel}` as const) : 'p'}
        >
          {title}
        </Typography>
        {description && (
          <Typography variant="body2" color="text.secondary" maxWidth={360}>
            {description}
          </Typography>
        )}
      </Stack>
      {action}
    </Stack>
  );
};

export default EmptyState;
