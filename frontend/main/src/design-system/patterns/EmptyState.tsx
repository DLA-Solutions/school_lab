import { ReactNode } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

const EmptyState = ({ title, description, action }: EmptyStateProps) => {
  return (
    <Stack alignItems="center" justifyContent="center" spacing={2} py={6} px={3}>
      <Box
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
        <Typography variant="h5" color="text.secondary">
          ∅
        </Typography>
      </Box>
      <Stack spacing={0.5} alignItems="center" textAlign="center">
        <Typography variant="subtitle1" color="text.primary">
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
