import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import { ErrorBanner } from 'design-system';
import { DocSection } from '../../components/DocLayout';
import CodeBlock from '../../components/CodeBlock';
import LivePreview from '../../components/LivePreview';
import SpecTable from '../../components/SpecTable';

const allowed = [
  [
    'Required field is empty',
    'Yes',
    'It asserts nothing about the domain — the request would be pointless',
  ],
  [
    'Value is not a well-formed e-mail or date',
    'Yes',
    'A format check, not a rule. The API still decides whether the value is acceptable',
  ],
  [
    'Text is longer than the column allows',
    'Yes',
    'Mirrors a storage limit; keep it as maxLength on the input, not as a thrown error',
  ],
  [
    'Submit while a request is in flight',
    'Yes',
    'A UI concern with no server equivalent',
  ],
  [
    'CPF check digits, minimum enrolment age, due date on a business day',
    'No',
    'Domain rules. They live in a service object and are enforced for mobile too',
  ],
  [
    'Whether this role may set this field',
    'No',
    'Pundit decides. The client may hide a control, but hiding is not enforcement',
  ],
  [
    'Whether a state transition is legal',
    'No',
    'AASM owns it; the API answers 409 with invalid_state_transition',
  ],
];

const statuses = [
  [
    <code key="k">422</code>,
    <code key="v">validation_error</code>,
    <span key="d">
      <code>details</code> is a field map
    </span>,
    'Field-level messages, plus the banner if any key is unknown',
  ],
  [
    <code key="k">409</code>,
    <code key="v">invalid_state_transition</code>,
    'Usually empty',
    'Banner — no single field is at fault',
  ],
  [
    <code key="k">403</code>,
    'Policy code',
    'Empty',
    'Banner, and the action should not have been offered',
  ],
  [<code key="k">404</code>, <code key="v">not_found</code>, 'Empty', 'Banner or a redirect — may also mean cross-tenant isolation'],
  [
    <code key="k">401</code>,
    '—',
    'Empty',
    'Retried once after a token refresh; if the refresh fails the access token is cleared and the original error surfaces',
  ],
];

const Validation = () => (
  <DocSection
    id="forms-validation"
    title="Validation"
    description="Client validation is UX. The API is the authority, and its error details are the field errors."
  >
    <Typography variant="body1" paragraph>
      The SPA is a thin client. Every business rule lives in a service object in <code>web/</code>,
      because the same rule has to hold for the mobile app, for a future integration, and for a
      request typed by hand. A rule re-expressed in React is a second implementation that will
      drift, and the day it drifts the browser will be the one that is wrong.
    </Typography>
    <Typography variant="body1" paragraph>
      So the client validates for speed of feedback and nothing else. It may tell you a required
      field is blank before a round trip; it may not tell you a due date is invalid, because it does
      not know. When the server answers, the server is right.
    </Typography>

    <Typography variant="h6" gutterBottom>
      Where the line sits
    </Typography>
    <SpecTable headers={['Check', 'Client-side?', 'Why']} rows={allowed} />
    <Typography variant="body2" color="text.secondary" mb={2}>
      The test is whether the check would appear in a domain PRD as a numbered business rule. If it
      would, it belongs to the API. If it is only about not wasting a request, it can live in the
      form.
    </Typography>

    <Typography variant="h6" gutterBottom>
      The error envelope
    </Typography>
    <Typography variant="body2" color="text.secondary" mb={2}>
      Every non-2xx response is meant to carry the same body. <code>services/api.ts</code> unwraps
      it into an <code>ApiError</code> before it ever reaches a component, so a form never parses
      JSON itself — and fills in defaults when a response arrives without the envelope, which is why
      a component can treat the fields below as always present.
    </Typography>
    <CodeBlock
      code={`// Response body — docs/api/README.md
{
  "error": {
    "code": "validation_error",
    "message": "Não foi possível salvar o aluno.",
    "details": { "birth_date": ["can't be blank"], "email": ["has already been taken"] }
  }
}

// What the client throws — services/api.ts
class ApiError extends Error {
  status: number;                      // 422
  code: string;                        // 'validation_error', or 'unexpected_error' as a fallback
  details: Record<string, unknown>;    // field → array of messages
  // message comes from Error. The API sends it in pt-BR; when the response carries no
  // envelope at all the client substitutes 'Request failed with status <n>', which is not
  // a string to show a user — branch on code or status before displaying it verbatim.
}`}
    />
    <Typography variant="body2" color="text.secondary" mb={2}>
      On a <code>422</code>, <code>details</code> is the Rails <code>errors.to_hash</code> of the
      record: keys are <strong>snake_case attribute names</strong> and values are{' '}
      <strong>arrays of messages</strong>. On every other status it is empty or carries a single
      diagnostic key, so it is not a field map and must not be treated as one.
    </Typography>

    <Typography variant="h6" gutterBottom>
      Which status goes where
    </Typography>
    <SpecTable headers={['HTTP', 'Typical code', 'details', 'Present as']} rows={statuses} />

    <Typography variant="h6" gutterBottom>
      Mapping details onto fields
    </Typography>
    <Typography variant="body2" color="text.secondary" mb={2}>
      The mapping is mechanical: take the first message for each key, translate the snake_case key
      to the form field it belongs to, and keep anything you could not place. What is left over goes
      into the banner — silently dropping an error the API bothered to send is how a form ends up
      refusing to save with no explanation.
    </Typography>
    <CodeBlock
      code={`// A function declaration, not an arrow: in a .tsx file \`<Field extends string>(…)\`
// parses as JSX.
function toFieldErrors<Field extends string>(error: ApiError, fields: readonly Field[]) {
  if (error.status !== 422) {
    return { fieldErrors: {} as Partial<Record<Field, string>>, banner: error.message };
  }

  const fieldErrors: Partial<Record<Field, string>> = {};
  const unmapped: string[] = [];

  Object.entries(error.details).forEach(([key, messages]) => {
    const first = Array.isArray(messages) ? String(messages[0]) : String(messages);

    if ((fields as readonly string[]).includes(key)) {
      fieldErrors[key as Field] = first;
    } else {
      unmapped.push(\`\${key}: \${first}\`);
    }
  });

  return { fieldErrors, banner: unmapped.length ? unmapped.join(' · ') : undefined };
}`}
    />
    <CodeBlock
      code={`const FIELDS = ['name', 'birth_date', 'email'] as const;

const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault();
  setErrors({});
  setBanner(undefined);
  setSubmitting(true);

  try {
    await createStudent(values);
    navigate(paths.students);
  } catch (err) {
    if (err instanceof ApiError) {
      const { fieldErrors, banner } = toFieldErrors(err, FIELDS);
      setErrors(fieldErrors);
      setBanner(banner);
    } else {
      setBanner(t('errors.network'));
    }
  } finally {
    setSubmitting(false);
  }
};`}
    />

    <Typography variant="h6" gutterBottom>
      Rendering the result
    </Typography>
    <Typography variant="body2" color="text.secondary" mb={2}>
      A field error is <code>error</code> plus <code>helperText</code> on the control — the{' '}
      <code>FormHelperText</code> override already turns the text <code>error.main</code>. Anything
      that is not about one field is an <code>ErrorBanner</code> at the top of the form. Both, when
      both apply.
    </Typography>
    <LivePreview>
      <Stack direction="column" spacing={2.5} maxWidth={420}>
        <ErrorBanner message="Não foi possível salvar o aluno." />
        <TextField
          variant="filled"
          size="small"
          label="Full name"
          defaultValue="Ana Souza"
          fullWidth
        />
        <TextField
          variant="filled"
          size="small"
          label="Date of birth"
          placeholder="dd/mm/aaaa"
          error
          helperText="can't be blank"
          sx={{ width: 180 }}
        />
        <TextField
          variant="filled"
          size="small"
          label="E-mail"
          defaultValue="ana@escola.br"
          error
          helperText="has already been taken"
          fullWidth
        />
      </Stack>
    </LivePreview>
    <CodeBlock
      code={`{banner && <ErrorBanner message={banner} />}

<TextField
  variant="filled"
  size="small"
  label={t('students.fields.birth_date')}
  value={values.birth_date}
  onChange={handleChange('birth_date')}
  error={Boolean(errors.birth_date)}
  helperText={errors.birth_date ?? t('students.hints.birth_date')}
  fullWidth
/>`}
    />

    <Typography variant="h6" gutterBottom>
      Messages and locale
    </Typography>
    <Typography variant="body2" color="text.secondary" mb={2}>
      The <code>message</code> on the envelope is already in pt-BR and is safe to show — with the
      one caveat above, that a response arriving without an envelope gets an English placeholder
      instead. The strings inside <code>details</code> are Rails validation messages and are not
      guaranteed to be
      user-ready; when a domain needs polished field copy, map the message to an i18n key by{' '}
      <code>code</code> and attribute rather than translating in the component. Until a domain does,
      showing the server message is better than showing nothing.
    </Typography>

    <Typography variant="h6" gutterBottom>
      Accessibility
    </Typography>
    <Typography variant="body2" color="text.secondary" mb={2}>
      MUI wires <code>aria-describedby</code> from the input to its helper text and sets{' '}
      <code>aria-invalid</code> from <code>error</code>, so passing both props is what makes the
      message reach a screen reader. <code>ErrorBanner</code> carries <code>role=&quot;alert&quot;</code>,
      so it is announced when it appears. Move focus to the first field with an error after a failed
      submit; do not rely on colour alone to mark it.
    </Typography>

    <Typography variant="h6" gutterBottom>
      Do
    </Typography>
    <ul>
      <li>
        <Typography variant="body2">
          Clear a field&apos;s error as soon as its value changes, so the form stops contradicting
          what is on screen.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Keep the submit button enabled until it is actually submitting. A disabled button with no
          explanation is a validation message the user cannot read.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Surface every key in <code>details</code>, even ones the form does not own.
        </Typography>
      </li>
    </ul>

    <Typography variant="h6" gutterBottom>
      Don&apos;t
    </Typography>
    <ul>
      <li>
        <Typography variant="body2">
          Reimplement a business rule client-side, even &quot;just to save a round trip&quot;. That
          is the one thing this page exists to prevent.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Read <code>details</code> as a field map on a non-422 response; it is not one.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Show a raw <code>code</code> such as <code>membership_suspended</code> to a user — that
          identifier is for the client to branch on, and <code>message</code> is for the person.
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Validate on every keystroke. Validate on submit, correct on change.
        </Typography>
      </li>
    </ul>
  </DocSection>
);

export default Validation;
