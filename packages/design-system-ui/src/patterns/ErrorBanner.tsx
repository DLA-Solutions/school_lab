import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';

export interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  /** Label of the retry action. Also its accessible name, since the button has no other text. */
  retryLabel?: string;
}

const ErrorBanner = ({ message, onRetry, retryLabel = 'Retry' }: ErrorBannerProps) => {
  return (
    <Alert
      severity="error"
      role="alert"
      action={
        onRetry ? (
          <Button color="inherit" size="small" onClick={onRetry}>
            {retryLabel}
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
