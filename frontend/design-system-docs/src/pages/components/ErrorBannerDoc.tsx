import { ErrorBanner } from 'design-system';
import ComponentDocPage from '../../components/ComponentDocPage';

const ErrorBannerDoc = () => (
  <ComponentDocPage
    title="ErrorBanner"
    description="Inline error alert for forms and sections."
    whenToUse={['Sign-in failures', 'Section-level fetch errors with retry']}
    whenNotToUse={['Field validation — map API details to TextField errors']}
    props={[
      { name: 'message', type: 'string', required: true, description: 'Error message' },
      { name: 'onRetry', type: '() => void', description: 'Optional retry action' },
      {
        name: 'retryLabel',
        type: 'string',
        description:
          "Label of the retry button, default 'Retry'. It is also the button's accessible name, since the button has no other text",
      },
    ]}
    code={`import { ErrorBanner } from 'design-system';

{error && <ErrorBanner message={error} />}`}
    preview={<ErrorBanner message="Invalid email or password." />}
    variants={<ErrorBanner message="Network error." onRetry={() => undefined} />}
  />
);

export default ErrorBannerDoc;
