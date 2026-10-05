import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
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
import MyAtas from './MyAtas';

const user = userEvent.setup({ delay: null });

const STUDENTS_PATH = `/api/v1/schools/${SCHOOL_ID}/me/students`;
const incidentsPath = (studentId: number) =>
  `/api/v1/schools/${SCHOOL_ID}/me/students/${studentId}/incidents`;

const child = (id: number, name: string) => ({ id, school_id: SCHOOL_ID, name });

const page = <T,>(rows: T[]) => ({ data: rows, meta: { page: 1, per_page: 25, total: rows.length } });

const incidentRow = (overrides: Record<string, unknown> = {}) => ({
  id: 5,
  student_id: 1,
  incident_type_id: 9,
  category: 'pastoral',
  severity: null,
  visibility: 'guardian',
  status: 'approved',
  description: null,
  guardian_points_raised: 'A família relatou dificuldades com a lição de casa.',
  school_response: 'A escola vai acompanhar de perto nas próximas semanas.',
  published_at: '2026-03-11T09:00:00Z',
  created_at: '2026-03-10T12:00:00Z',
  updated_at: '2026-03-10T12:00:00Z',
  student_name: 'Pedro Silva',
  incident_type_name: 'Reunião com os pais',
  guardians: [{ guardian_id: 31, name: 'Marcela Silva', relationship: 'mother' }],
  ...overrides,
});

const stubChildren = (rows: ReturnType<typeof child>[]) =>
  server.use(http.get(apiUrl(STUDENTS_PATH), () => HttpResponse.json(page(rows))));

const stubIncidents = (studentId: number, rows: Record<string, unknown>[]) =>
  server.use(http.get(apiUrl(incidentsPath(studentId)), () => HttpResponse.json(page(rows))));

beforeEach(() => {
  setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);
  vi.spyOn(guardianSchool, 'useGuardianSchool').mockReturnValue({
    school_id: SCHOOL_ID,
  } as ReturnType<typeof guardianSchool.useGuardianSchool>);
});

describe('MyAtas', () => {
  it('merges every child\'s published atas into one list', async () => {
    stubChildren([child(1, 'Pedro Silva'), child(2, 'Mariana Silva')]);
    stubIncidents(1, [incidentRow()]);
    stubIncidents(2, [
      incidentRow({ id: 6, student_id: 2, student_name: 'Mariana Silva', created_at: '2026-04-01T12:00:00Z' }),
    ]);

    renderWithTheme(<MyAtas />);

    expect(await screen.findByText('Pedro Silva')).toBeInTheDocument();
    expect(screen.getByText('Mariana Silva')).toBeInTheDocument();
  });

  it('says plainly when there is nothing to show', async () => {
    stubChildren([child(1, 'Pedro Silva')]);
    stubIncidents(1, []);

    renderWithTheme(<MyAtas />);

    expect(await screen.findByText('Nenhuma ata encontrada')).toBeInTheDocument();
  });

  it('says so when the children cannot be loaded', async () => {
    server.use(http.get(apiUrl(STUDENTS_PATH), () => HttpResponse.error()));

    renderWithTheme(<MyAtas />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar as atas.');
  });

  it('narrows the list to one student via the filter', async () => {
    stubChildren([child(1, 'Pedro Silva'), child(2, 'Mariana Silva')]);
    stubIncidents(1, [incidentRow()]);
    stubIncidents(2, [
      incidentRow({ id: 6, student_id: 2, student_name: 'Mariana Silva', created_at: '2026-04-01T12:00:00Z' }),
    ]);

    renderWithTheme(<MyAtas />);

    expect(await screen.findByText('Pedro Silva')).toBeInTheDocument();
    expect(screen.getByText('Mariana Silva')).toBeInTheDocument();

    await user.click(screen.getByRole('combobox', { name: /filho/i }));
    await user.click(await screen.findByRole('option', { name: 'Pedro Silva' }));

    expect(await screen.findByRole('row', { name: /pedro silva/i })).toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /mariana silva/i })).not.toBeInTheDocument();
  });

  it('narrows the list to a date range', async () => {
    stubChildren([child(1, 'Pedro Silva')]);
    stubIncidents(1, [
      incidentRow({ id: 5, created_at: '2026-03-10T12:00:00Z' }),
      incidentRow({ id: 6, created_at: '2026-05-20T12:00:00Z', incident_type_name: 'Ocorrência de maio' }),
    ]);

    renderWithTheme(<MyAtas />);

    expect(await screen.findByText('Reunião com os pais')).toBeInTheDocument();
    expect(screen.getByText('Ocorrência de maio')).toBeInTheDocument();

    const fromInput = screen.getByLabelText('De');
    await user.clear(fromInput);
    await user.type(fromInput, '2026-04-01');

    await waitFor(() => {
      expect(screen.queryByText('Reunião com os pais')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Ocorrência de maio')).toBeInTheDocument();
  });

  describe('PDF preview', () => {
    beforeEach(() => {
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock/1');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('opens the ata as a PDF through the guardian route and releases the file on close', async () => {
      stubChildren([child(1, 'Pedro Silva')]);
      stubIncidents(1, [incidentRow()]);

      server.use(
        http.get(apiUrl(`${incidentsPath(1)}/5/pdf`), () =>
          HttpResponse.arrayBuffer(new TextEncoder().encode('%PDF-1.4').buffer, {
            headers: { 'Content-Type': 'application/pdf' },
          }),
        ),
      );

      renderWithTheme(<MyAtas />);

      const row = await screen.findByRole('row', { name: /pedro silva/i });
      await user.click(within(row).getByRole('button', { name: /ver ata/i }));

      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      const frame = await screen.findByTitle('Ata');
      expect(frame).toHaveAttribute('src', 'blob:mock/1');

      await user.click(screen.getByRole('button', { name: /fechar/i }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock/1'));
    });

    it('shows an error banner when the PDF cannot be fetched', async () => {
      stubChildren([child(1, 'Pedro Silva')]);
      stubIncidents(1, [incidentRow()]);

      server.use(http.get(apiUrl(`${incidentsPath(1)}/5/pdf`), () => HttpResponse.error()));

      renderWithTheme(<MyAtas />);

      const row = await screen.findByRole('row', { name: /pedro silva/i });
      await user.click(within(row).getByRole('button', { name: /ver ata/i }));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        /não foi possível carregar o pdf da ata/i,
      );
    });
  });
});
