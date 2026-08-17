import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  ACCESS_EXPIRES_AT,
  FRESH_ACCESS_TOKEN,
  HttpResponse,
  SCHOOL_ID,
  apiUrl,
  http,
  server,
} from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { setAccessToken } from 'services/tokenStore';
import HealthRecordDialog from './HealthRecordDialog';

const user = userEvent.setup({ delay: null });

const STUDENT_ID = 12;
const SCHOOL_PATH = `/api/v1/schools/${SCHOOL_ID}/people/students/${STUDENT_ID}/health_record`;
const PORTAL_PATH = `/api/v1/schools/${SCHOOL_ID}/me/students/${STUDENT_ID}/health_record`;

const sheet = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  student_id: STUDENT_ID,
  student_name: 'Mariana Sales',
  content: 'Alérgica a amendoim.',
  content_updated_at: '2026-08-17T12:00:00Z',
  updated_by_name: 'carol@example.com',
  filled: true,
  ...overrides,
});

const stubSheet = (path: string, data = sheet()) =>
  server.use(http.get(apiUrl(path), () => HttpResponse.json({ data })));

beforeEach(() => {
  setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);
});

const renderDialog = (props: Partial<Parameters<typeof HealthRecordDialog>[0]> = {}) =>
  renderWithTheme(
    <HealthRecordDialog
      open
      schoolId={SCHOOL_ID}
      studentId={STUDENT_ID}
      studentName="Mariana Sales"
      onClose={vi.fn()}
      {...props}
    />,
  );

describe('HealthRecordDialog', () => {
  it('shows what the family wrote about the child', async () => {
    stubSheet(SCHOOL_PATH);

    renderDialog();

    expect(await screen.findByDisplayValue('Alérgica a amendoim.')).toBeInTheDocument();
  });

  // A note nobody can attribute is one nobody acts on: the secretary has to know whether the
  // allergy came from the mother or from the front desk.
  it('says who wrote it last', async () => {
    stubSheet(SCHOOL_PATH);

    renderDialog();

    expect(await screen.findByText(/carol@example.com/)).toBeInTheDocument();
  });

  // An empty sheet is a family that has not been asked yet, not a child with nothing to report.
  it('says plainly when nobody has filled it in', async () => {
    stubSheet(
      SCHOOL_PATH,
      sheet({ content: '', content_updated_at: null, updated_by_name: null, filled: false }),
    );

    renderDialog();

    expect(await screen.findByText('Ainda não preenchida.')).toBeInTheDocument();
  });

  it('saves what was typed', async () => {
    let sent: unknown = null;
    stubSheet(SCHOOL_PATH, sheet({ content: '' }));
    server.use(
      http.patch(apiUrl(SCHOOL_PATH), async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({ data: sheet({ content: 'Asma' }) });
      }),
    );

    renderDialog();

    const field = await screen.findByLabelText(/Informações de saúde/);
    await user.type(field, 'Asma');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(sent).toEqual({ health_record: { content: 'Asma' } }));
    expect(await screen.findByText('Ficha salva.')).toBeInTheDocument();
  });

  it('has nothing to save until the text changes', async () => {
    stubSheet(SCHOOL_PATH);

    renderDialog();
    await screen.findByDisplayValue('Alérgica a amendoim.');

    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
  });

  // The family reaches the sheet through the portal, which only ever answers about their own
  // children — the school's own route would refuse them.
  it('reads through the guardian portal when the family opens it', async () => {
    let calledPortal = false;
    server.use(
      http.get(apiUrl(PORTAL_PATH), () => {
        calledPortal = true;
        return HttpResponse.json({ data: sheet() });
      }),
    );

    renderDialog({ asGuardian: true });

    await screen.findByDisplayValue('Alérgica a amendoim.');
    expect(calledPortal).toBe(true);
  });

  it('says so when the sheet cannot be loaded', async () => {
    server.use(http.get(apiUrl(SCHOOL_PATH), () => HttpResponse.error()));

    renderDialog();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar a ficha de saúde.',
    );
  });

  it('reports a save that failed instead of looking saved', async () => {
    stubSheet(SCHOOL_PATH, sheet({ content: '' }));
    server.use(http.patch(apiUrl(SCHOOL_PATH), () => HttpResponse.error()));

    renderDialog();

    await user.type(await screen.findByLabelText(/Informações de saúde/), 'Asma');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('Ficha salva.')).not.toBeInTheDocument();
  });

  it('fetches nothing while it is closed', async () => {
    let called = false;
    server.use(
      http.get(apiUrl(SCHOOL_PATH), () => {
        called = true;
        return HttpResponse.json({ data: sheet() });
      }),
    );

    renderDialog({ open: false });

    expect(called).toBe(false);
  });
});
