import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay } from 'msw';
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
const RECORD_ID = 5;
const RECORDS_PATH = `/api/v1/schools/${SCHOOL_ID}/me/students/${STUDENT_ID}/health_records`;

const record = (overrides: Record<string, unknown> = {}) => ({
  id: RECORD_ID,
  student_id: STUDENT_ID,
  title: 'Alergia a amendoim',
  content: 'Usa bombinha.',
  has_document: true,
  document_url: '/rails/active_storage/blobs/abc/receita.pdf',
  document_filename: 'receita.pdf',
  created_by_name: 'carol@example.com',
  updated_by_name: 'carol@example.com',
  content_updated_at: '2026-08-17T12:00:00Z',
  created_at: '2026-08-17T10:00:00Z',
  ...overrides,
});

const stubRecord = (data = record()) =>
  server.use(http.get(apiUrl(`${RECORDS_PATH}/${RECORD_ID}`), () => HttpResponse.json({ data })));

beforeEach(() => {
  setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);
});

const renderDialog = (props: Partial<Parameters<typeof HealthRecordDialog>[0]> = {}) =>
  renderWithTheme(
    <HealthRecordDialog
      open
      schoolId={SCHOOL_ID}
      studentId={STUDENT_ID}
      recordId={RECORD_ID}
      asGuardian
      onClose={vi.fn()}
      {...props}
    />,
  );

describe('HealthRecordDialog', () => {
  it('shows the record the family wrote', async () => {
    stubRecord();
    renderDialog();
    expect(await screen.findByDisplayValue('Alergia a amendoim')).toBeInTheDocument();
  });

  it('creates a record with title and content', async () => {
    let body = '';
    server.use(
      http.post(apiUrl(RECORDS_PATH), async ({ request }) => {
        body = await request.text();
        return HttpResponse.json({ data: record() });
      }),
    );
    renderDialog({ recordId: null });
    await user.type(await screen.findByLabelText(/^Título/), 'Asma');
    await user.type(screen.getByLabelText(/Informações de saúde/), 'Bombinha diária.');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(body).toContain('Asma'));
  });

  it('uploads a PDF when one is chosen', async () => {
    let body = '';
    server.use(
      http.post(apiUrl(RECORDS_PATH), async ({ request }) => {
        body = await request.text();
        return HttpResponse.json({ data: record() });
      }),
    );
    renderDialog({ recordId: null });
    await user.type(await screen.findByLabelText(/^Título/), 'Medicação');
    fireEvent.change(screen.getByLabelText('Anexar PDF (opcional)'), {
      target: { files: [new File(['pdf'], 'receita.pdf', { type: 'application/pdf' })] },
    });
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(body).toContain('health_record[document]'));
  });

  it('rejects a non-PDF attachment before saving', async () => {
    renderDialog({ recordId: null });
    await user.type(await screen.findByLabelText(/^Título/), 'Medicação');
    fireEvent.change(screen.getByLabelText('Anexar PDF (opcional)'), {
      target: { files: [new File(['x'], 'foto.png', { type: 'image/png' })] },
    });
    expect(screen.getByText('Somente arquivos PDF são aceitos.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
  });

  it('hides save controls in read-only mode', async () => {
    stubRecord();
    renderDialog({ readOnly: true });
    await screen.findByDisplayValue('Alergia a amendoim');
    expect(screen.queryByRole('button', { name: 'Salvar' })).not.toBeInTheDocument();
  });

  it('shows saving state while the request is in flight', async () => {
    stubRecord(record({ content: '' }));
    server.use(
      http.patch(apiUrl(`${RECORDS_PATH}/${RECORD_ID}`), async () => {
        await delay(100);
        return HttpResponse.json({ data: record({ content: 'Asma' }) });
      }),
    );
    renderDialog();
    await user.type(await screen.findByLabelText(/Informações de saúde/), 'Asma');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByRole('button', { name: 'Salvando...' })).toBeInTheDocument();
  });
});
