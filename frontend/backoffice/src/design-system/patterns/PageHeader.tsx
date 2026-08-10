import { ReactNode } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { fontFamily } from 'theme/typography';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

const PageHeader = ({ title, subtitle, actions }: PageHeaderProps) => {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      alignItems={{ xs: 'stretch', sm: 'center' }}
      justifyContent="space-between"
    >
      <Stack spacing={0.5}>
        <Typography variant="h6" fontWeight={400} fontFamily={fontFamily.workSans}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Stack>
      {actions && (
        // Bottom-aligned, not centred. Labels stack *above* the field in this theme
        // (`MuiInputLabel` is `position: static`), so a labelled select is taller than a bare
        // search box by the height of its label — centring them left the two input boxes at
        // different heights, which is what read as misaligned across the register screens.
        // Lining up their bottom edges puts the boxes on one line and leaves the labels above.
        <Stack direction="row" spacing={2} alignItems="flex-end">
          {actions}
        </Stack>
      )}
    </Stack>
  );
};

export default PageHeader;
