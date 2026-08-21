import { ReactNode } from 'react';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export interface SectionCardProps {
  title?: string;
  headerActions?: ReactNode;
  children: ReactNode;
  padding?: number;
}

const SectionCard = ({ title, headerActions, children, padding = 3.5 }: SectionCardProps) => {
  const hasHeader = Boolean(title || headerActions);
  const isFlush = padding === 0;

  return (
    <Paper sx={{ p: padding }}>
      {hasHeader && (
        <Stack
          {...(isFlush ? { px: 3.5, pt: 3.5 } : {})}
          pb={2}
          spacing={1.5}
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          justifyContent="space-between"
        >
          {title && (
            <Typography variant="h6" fontWeight={400}>
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
