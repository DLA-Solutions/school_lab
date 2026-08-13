import { ReactNode } from 'react';
import Alert from '@mui/material/Alert';
import type { SxProps, Theme } from '@mui/material/styles';

export interface SuccessBannerProps {
  message?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  variant?: 'filled' | 'outlined' | 'standard';
  sx?: SxProps<Theme>;
}

const SuccessBanner = ({ message, children, action, variant, sx }: SuccessBannerProps) => {
  return (
    <Alert
      severity="success"
      role="status"
      variant={variant}
      action={action}
      sx={{ letterSpacing: 0.5, ...sx }}
    >
      {children ?? message}
    </Alert>
  );
};

export default SuccessBanner;
