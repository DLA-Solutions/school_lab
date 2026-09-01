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

    renderWithTheme(<MyHealthRecords />);

    expect(await screen.findByText('Mariana Sales')).toBeInTheDocument();
    expect(screen.getByText('Pedro Sales')).toBeInTheDocument();
  });

  it('says which children still have nothing on file', async () => {
    stubChildren([child(1, 'Mariana Sales'), child(2, 'Pedro Sales')]);
    stubHealth(1, {
      profile: { ...emptyProfile(1), blood_type: 'O+' },
      records: [{ id: 1, title: 'Alergia', content: 'Amendoim' }],
    });
    stubHealth(2);

    renderWithTheme(<MyHealthRecords />);

    expect(await screen.findByText('Preenchida')).toBeInTheDocument();
    expect(screen.getByText('Não preenchida')).toBeInTheDocument();
  });

  it('shows the profile section and records list for each child', async () => {
    stubChildren([child(1, 'Mariana Sales')]);
    stubHealth(1, {
      records: [
        {
          id: 1,
          student_id: 1,
          title: 'Alergia a amendoim',
          content: 'Usa bombinha.',
          has_document: false,
          document_url: null,
          document_filename: null,
          created_by_name: 'carol@example.com',
          updated_by_name: 'carol@example.com',
          content_updated_at: '2026-08-17T12:00:00Z',
          created_at: '2026-08-17T10:00:00Z',
        },
      ],
    });

    renderWithTheme(<MyHealthRecords />);

    expect(await screen.findByText('Dados gerais')).toBeInTheDocument();
    expect(screen.getByText('Registros de saúde')).toBeInTheDocument();
    expect(await screen.findByText('Alergia a amendoim')).toBeInTheDocument();
  });

  it('says plainly when no child is linked', async () => {
    stubChildren([]);

    renderWithTheme(<MyHealthRecords />);

    expect(await screen.findByText('Nenhum filho vinculado ao seu cadastro.')).toBeInTheDocument();
  });

  it('still lists a child whose health data could not be read', async () => {
    stubChildren([child(1, 'Mariana Sales')]);
    server.use(http.get(apiUrl(profilePath(1)), () => HttpResponse.error()));

    renderWithTheme(<MyHealthRecords />);

    expect(await screen.findByText('Mariana Sales')).toBeInTheDocument();
  });

  it('says so when the children cannot be loaded', async () => {
    server.use(http.get(apiUrl(STUDENTS_PATH), () => HttpResponse.error()));

    renderWithTheme(<MyHealthRecords />);

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

    renderWithTheme(<MyHealthRecords />);

    expect(await screen.findByText('Não preenchida')).toBeInTheDocument();

    const bloodType = await screen.findByLabelText('Tipo sanguíneo');
    await user.click(bloodType);
    await user.click(screen.getByRole('option', { name: 'O+' }));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(screen.getByText('Preenchida')).toBeInTheDocument();
    });
    expect(screen.queryByText('Não preenchida')).not.toBeInTheDocument();
  });

  it('opens the add-record dialog from the list', async () => {
    stubChildren([child(1, 'Mariana Sales')]);
    stubHealth(1);

    renderWithTheme(<MyHealthRecords />);

    await user.click(await screen.findByRole('button', { name: 'Adicionar registro' }));

    expect(await screen.findByLabelText(/^Título/)).toBeInTheDocument();
  });
});
