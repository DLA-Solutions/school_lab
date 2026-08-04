import { ErrorBanner } from 'design-system';

export const Default = () => <ErrorBanner message="Invalid email or password." />;

export const WithRetry = () => (
  <ErrorBanner message="Could not load data." onRetry={() => window.alert('Retry clicked')} />
);
