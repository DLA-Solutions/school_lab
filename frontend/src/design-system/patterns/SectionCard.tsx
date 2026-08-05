import { ReactNode } from 'react';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { fontFamily } from 'theme/typography';

export interface SectionCardProps {
  title?: string;
  headerActions?: ReactNode;
  children: ReactNode;
  padding?: number;
}

const SectionCard = ({ title, headerActions, children, padding = 0 }: SectionCardProps) => {
  return (
    <Paper sx={padding === 0 ? { p: 0 } : undefined}>
      {(title || headerActions) && (
        <Stack
          px={3.5}
          spacing={1.5}
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          justifyContent="space-between"
        >
          {title && (
            <Typography variant="h6" fontWeight={400} fontFamily={fontFamily.workSans}>
              {title}
            </Typography>
          )}
          {headerActions}
        </Stack>
      )}
      {children}
    </Paper>
  );
};

export default SectionCard;
