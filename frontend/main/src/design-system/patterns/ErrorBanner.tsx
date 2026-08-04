import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';

export interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

const ErrorBanner = ({ message, onRetry }: ErrorBannerProps) => {
  return (
    <Alert
      severity="error"
      role="alert"
      action={
        onRetry ? (
          <Button color="inherit" size="small" onClick={onRetry}>
            Retry
          </Button>
        ) : undefined
      }
      sx={{ letterSpacing: 0.5 }}
    >
      {message}
    </Alert>
  );
};

export default ErrorBanner;
