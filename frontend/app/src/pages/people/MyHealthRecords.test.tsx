import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
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
import * as guardianSchool from 'providers/useGuardianSchool';
import MyHealthRecords from './MyHealthRecords';

const user = userEvent.setup({ delay: null });

const STUDENTS_PATH = `/api/v1/schools/${SCHOOL_ID}/me/students`;
const profilePath = (id: number) =>
  `/api/v1/schools/${SCHOOL_ID}/me/students/${id}/health_profile`;
const recordsPath = (id: number) =>
  `/api/v1/schools/${SCHOOL_ID}/me/students/${id}/health_records`;

const child = (id: number, name: string) => ({ id, school_id: SCHOOL_ID, name });

const emptyProfile = (studentId: number) => ({
  student_id: studentId,
  blood_type: null,
  health_plan_name: null,
  health_plan_number: null,
  emergency_contact_name: null,
  emergency_contact_phone: null,
  special_care_notes: null,
});

const record = (id: number, studentId: number, title: string) => ({
  id,
  student_id: studentId,
  title,
  content: 'Usa bombinha.',
  has_document: false,
  document_url: null,
  document_filename: null,
  created_by_name: 'carol@example.com',
  updated_by_name: 'carol@example.com',
  content_updated_at: '2026-08-17T12:00:00Z',
  created_at: '2026-08-17T10:00:00Z',
});

const renderPage = (path = '/ficha-de-saude') =>
  renderWithTheme(
    <MemoryRouter initialEntries={[path]}>
      <MyHealthRecords />
    </MemoryRouter>,
  );

const stubChildren = (rows: ReturnType<typeof child>[]) =>
  server.use(
    http.get(apiUrl(STUDENTS_PATH), () =>
      HttpResponse.json({ data: rows, meta: { page: 1, per_page: 25, total: rows.length } }),
    ),
  );

const stubHealth = (
  id: number,
  {
    profile = emptyProfile(id),
    records = [] as unknown[],
  }: { profile?: Record<string, unknown>; records?: unknown[] } = {},
) =>
  server.use(
    http.get(apiUrl(profilePath(id)), () => HttpResponse.json({ data: profile })),
    http.get(apiUrl(recordsPath(id)), () => HttpResponse.json({ data: records })),
  );

beforeEach(() => {
  setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);
  vi.spyOn(guardianSchool, 'useGuardianSchool').mockReturnValue({
    school_id: SCHOOL_ID,
  } as ReturnType<typeof guardianSchool.useGuardianSchool>);
});

describe('MyHealthRecords', () => {
  it('lists every child the family answers for', async () => {
    stubChildren([child(1, 'Mariana Sales'), child(2, 'Pedro Sales')]);
    stubHealth(1);
    stubHealth(2);

    renderPage();

    expect(await screen.findByText('Mariana Sales')).toBeInTheDocument();
    expect(screen.getByText('Pedro Sales')).toBeInTheDocument();
  });

  it('says which children still have nothing on file', async () => {
    stubChildren([child(1, 'Mariana Sales'), child(2, 'Pedro Sales'), child(3, 'Ana Sales')]);
    stubHealth(1, {
      profile: { ...emptyProfile(1), blood_type: 'O+' },
      records: [record(1, 1, 'Alergia')],
    });
    stubHealth(2);
    stubHealth(3, {
      records: [record(2, 3, 'A'), record(3, 3, 'B'), record(4, 3, 'C')],
    });

    renderPage();

    expect(await screen.findByText('Não preenchida')).toBeInTheDocument();
    expect(screen.getAllByText('Preenchida')).toHaveLength(2);
    expect(screen.getByText('Nenhum registro')).toBeInTheDocument();
    expect(screen.getByText('1 registro')).toBeInTheDocument();
    expect(screen.getByText('3 registros')).toBeInTheDocument();
    expect(screen.getByText('Preencher')).toBeInTheDocument();
    expect(screen.getAllByText('Abrir')).toHaveLength(2);
    expect(screen.queryByText('Dados gerais')).not.toBeInTheDocument();
  });

  it('keeps a single child on the list until the row is chosen', async () => {
    stubChildren([child(1, 'Mariana Sales')]);
    stubHealth(1, {
      records: [record(1, 1, 'Alergia a amendoim')],
    });

    renderPage();

    expect(
      await screen.findByRole('button', { name: 'Ficha de saúde de Mariana Sales' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Dados gerais')).not.toBeInTheDocument();
    expect(screen.queryByText('Alergia a amendoim')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ficha de saúde de Mariana Sales' }));

    expect(await screen.findByText('Dados gerais')).toBeInTheDocument();
    expect(screen.getByText('Registros de saúde')).toBeInTheDocument();
    expect(await screen.findByText('Alergia a amendoim')).toBeInTheDocument();
  });

  it('opens one child at a time and returns to the list', async () => {
    stubChildren([child(1, 'Mariana Sales'), child(2, 'Pedro Sales')]);
    stubHealth(1, { records: [record(1, 1, 'Alergia a amendoim')] });
    stubHealth(2, { records: [record(2, 2, 'Asma')] });

    renderPage();

    expect(await screen.findByText('Mariana Sales')).toBeInTheDocument();
    expect(screen.queryByText('Dados gerais')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ficha de saúde de Mariana Sales' }));

    expect(await screen.findByText('Alergia a amendoim')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Mariana Sales' })).toBeInTheDocument();
    expect(screen.getByText('Ficha de saúde')).toBeInTheDocument();
    expect(screen.queryByText('Asma')).not.toBeInTheDocument();
    expect(screen.queryByText('Pedro Sales')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Todos os filhos' }));

    expect(await screen.findByText('Pedro Sales')).toBeInTheDocument();
    expect(screen.getByText('Mariana Sales')).toBeInTheDocument();
    expect(screen.queryByText('Dados gerais')).not.toBeInTheDocument();
    expect(screen.queryByText('Alergia a amendoim')).not.toBeInTheDocument();
    expect(screen.queryByText('Asma')).not.toBeInTheDocument();
  });

  it('says plainly when no child is linked', async () => {
    stubChildren([]);

    renderPage();

    expect(await screen.findByText('Nenhum filho vinculado ao seu cadastro.')).toBeInTheDocument();
  });

  it('keeps the empty state when the family has no child and the query names one', async () => {
    stubChildren([]);

    renderPage('/ficha-de-saude?student=99');

    expect(await screen.findByText('Nenhum filho vinculado ao seu cadastro.')).toBeInTheDocument();
    expect(screen.queryByText('Dados gerais')).not.toBeInTheDocument();
  });

  it('still lists a child whose health data could not be read', async () => {
    stubChildren([child(1, 'Mariana Sales')]);
    server.use(
      http.get(apiUrl(profilePath(1)), () => HttpResponse.error()),
      http.get(apiUrl(recordsPath(1)), () => HttpResponse.error()),
    );

    renderPage();

    expect(await screen.findByText('Mariana Sales')).toBeInTheDocument();
    expect(screen.getByText('Não preenchida')).toBeInTheDocument();
    expect(screen.getByText('Nenhum registro')).toBeInTheDocument();
  });

  it('says so when the children cannot be loaded', async () => {
    server.use(http.get(apiUrl(STUDENTS_PATH), () => HttpResponse.error()));

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar seus filhos.',
    );
  });

  it('updates the filled chip after saving the profile', async () => {
    stubChildren([child(1, 'Mariana Sales')]);
    let saved = false;
    server.use(
      http.get(apiUrl(profilePath(1)), () =>
        HttpResponse.json({
          data: saved ? { ...emptyProfile(1), blood_type: 'O+' } : emptyProfile(1),
        }),
      ),
      http.get(apiUrl(recordsPath(1)), () => HttpResponse.json({ data: [] })),
      http.put(apiUrl(profilePath(1)), () => {
        saved = true;
        return HttpResponse.json({ data: { ...emptyProfile(1), blood_type: 'O+' } });
      }),
    );

    renderPage();

    expect(await screen.findByText('Não preenchida')).toBeInTheDocument();
    expect(screen.getByText('Nenhum registro')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ficha de saúde de Mariana Sales' }));

    const bloodType = await screen.findByLabelText('Tipo sanguíneo');
    await user.click(bloodType);
    await user.click(screen.getByRole('option', { name: 'O+' }));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Dados gerais salvos.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Todos os filhos' }));

    await waitFor(() => {
      expect(screen.getByText('Preenchida')).toBeInTheDocument();
    });
    expect(screen.queryByText('Não preenchida')).not.toBeInTheDocument();
    expect(screen.getByText('Abrir')).toBeInTheDocument();
    expect(screen.getByText('Nenhum registro')).toBeInTheDocument();
  });

  it('updates the record count after a record is added', async () => {
    stubChildren([child(1, 'Mariana Sales')]);
    let records: ReturnType<typeof record>[] = [];
    server.use(
      http.get(apiUrl(profilePath(1)), () => HttpResponse.json({ data: emptyProfile(1) })),
      http.get(apiUrl(recordsPath(1)), () => HttpResponse.json({ data: records })),
      http.post(apiUrl(recordsPath(1)), () => {
        records = [record(1, 1, 'Alergia a amendoim')];
        return HttpResponse.json({ data: records[0] });
      }),
    );

    renderPage();

    expect(await screen.findByText('Nenhum registro')).toBeInTheDocument();
    expect(screen.getByText('Não preenchida')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ficha de saúde de Mariana Sales' }));
    await user.click(await screen.findByRole('button', { name: 'Adicionar registro' }));
    await user.type(await screen.findByLabelText(/^Título/), 'Alergia a amendoim');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Alergia a amendoim')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Todos os filhos' }));

    expect(await screen.findByText('1 registro')).toBeInTheDocument();
    expect(screen.getByText('Preenchida')).toBeInTheDocument();
    expect(screen.queryByText('Não preenchida')).not.toBeInTheDocument();
  });

  it('opens the add-record dialog from the chosen child', async () => {
    stubChildren([child(1, 'Mariana Sales')]);
    stubHealth(1);

    renderPage();

    await user.click(
      await screen.findByRole('button', { name: 'Ficha de saúde de Mariana Sales' }),
    );
    await user.click(await screen.findByRole('button', { name: 'Adicionar registro' }));

    expect(await screen.findByLabelText(/^Título/)).toBeInTheDocument();
  });

  it('does not load a sheet for a student outside the family', async () => {
    stubChildren([child(1, 'Mariana Sales')]);
    stubHealth(1);
    let foreignHealthCalls = 0;
    server.use(
      http.get(apiUrl(profilePath(99)), () => {
        foreignHealthCalls += 1;
        return HttpResponse.json({
          data: { ...emptyProfile(99), blood_type: 'A+' },
        });
      }),
      http.get(apiUrl(recordsPath(99)), () => {
        foreignHealthCalls += 1;
        return HttpResponse.json({ data: [record(9, 99, 'Ficha alheia')] });
      }),
    );

    renderPage('/ficha-de-saude?student=99');

    expect(await screen.findByText('Esse filho não está no seu cadastro.')).toBeInTheDocument();
    expect(screen.queryByText('Dados gerais')).not.toBeInTheDocument();
    expect(screen.queryByText('Ficha alheia')).not.toBeInTheDocument();
    expect(foreignHealthCalls).toBe(0);

    await user.click(screen.getByRole('button', { name: 'Todos os filhos' }));

    expect(await screen.findByText('Mariana Sales')).toBeInTheDocument();
    expect(screen.queryByText('Dados gerais')).not.toBeInTheDocument();
    expect(screen.queryByText('Ficha alheia')).not.toBeInTheDocument();
    expect(foreignHealthCalls).toBe(0);
  });
});
