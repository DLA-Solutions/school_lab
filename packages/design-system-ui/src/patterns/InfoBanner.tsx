import { ReactNode } from 'react';
import Alert from '@mui/material/Alert';
import type { SxProps, Theme } from '@mui/material/styles';

export interface InfoBannerProps {
  message?: ReactNode;
  children?: ReactNode;
  variant?: 'filled' | 'outlined' | 'standard';
  sx?: SxProps<Theme>;
}

const InfoBanner = ({ message, children, variant, sx }: InfoBannerProps) => {
  return (
    <Alert severity="info" role="status" variant={variant} sx={{ letterSpacing: 0.5, ...sx }}>
      {children ?? message}
    </Alert>
  );
};

export default InfoBanner;
