import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import dayjs from 'dayjs';
import { MemoryRouter } from 'react-router';
import {
  ACCESS_EXPIRES_AT,
  FRESH_ACCESS_TOKEN,
  HttpResponse,
  SCHOOL_ID,
  apiUrl,
  http,
  jsonError,
  server,
} from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { setAccessToken } from 'services/tokenStore';
import * as guardianSchool from 'providers/useGuardianSchool';
import MyDailyRoutine from './MyDailyRoutine';

const STUDENTS_PATH = `/api/v1/schools/${SCHOOL_ID}/me/students`;
const ROUTINE_PATH = '/api/v1/schools/:schoolId/me/students/:studentId/daily_routine_entries';

const SENT_NOTES = 'Fruta da manhã sem pressa.';
const DRAFT_NOTES = 'Rascunho invisível da rotina';

const child = (id: number, name: string) => ({ id, school_id: SCHOOL_ID, name });

const page = <T,>(rows: T[]) => ({
  data: rows,
  meta: { page: 1, per_page: 25, total: rows.length },
});

const stubChildren = (rows: ReturnType<typeof child>[]) =>
  server.use(http.get(apiUrl(STUDENTS_PATH), () => HttpResponse.json(page(rows))));

interface SeenRequest {
  method: string;
  pathname: string;
  searchParams: URLSearchParams;
}

const recordRequests = () => {
  const seen: SeenRequest[] = [];

  server.events.on('request:start', ({ request }) => {
    const url = new URL(request.url);
    seen.push({ method: request.method, pathname: url.pathname, searchParams: url.searchParams });
  });

  return seen;
};

const renderPage = (search = '') =>
  renderWithTheme(
    <MemoryRouter initialEntries={[`/minha-rotina${search}`]}>
      <MyDailyRoutine />
    </MemoryRouter>,
  );

const routineCallsFor = (seen: SeenRequest[], studentId: number) =>
  seen.filter(
    (call) =>
      call.pathname ===
      `/api/v1/schools/${SCHOOL_ID}/me/students/${studentId}/daily_routine_entries`,
  );

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 21, 12, 0, 0));
  setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);
  vi.spyOn(guardianSchool, 'useGuardianSchool').mockReturnValue({
    school_id: SCHOOL_ID,
  } as ReturnType<typeof guardianSchool.useGuardianSchool>);
});

afterEach(() => {
  server.events.removeAllListeners();
  vi.useRealTimers();
});

describe('MyDailyRoutine', () => {
  it('shows the sent routine for the guardian child and no draft or send controls', async () => {
    const seen = recordRequests();
    stubChildren([child(1, 'Pedro Silva')]);

    renderPage();

    expect(await screen.findByText(SENT_NOTES)).toBeInTheDocument();
    expect(screen.getByText('Comeu', { exact: true })).toBeInTheDocument();
    expect(screen.getByText('Não comeu')).toBeInTheDocument();
    expect(screen.getByText('Não registrado')).toBeInTheDocument();
    expect(screen.getByText('2', { exact: true })).toBeInTheDocument();
    expect(screen.getByText('3', { exact: true })).toBeInTheDocument();
    expect(screen.getByText('15/10/2026')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Lanche' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Cocô' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Xixi' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Observações' })).toBeInTheDocument();

    expect(screen.queryByText(DRAFT_NOTES)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /enviar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /salvar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Enviar' })).not.toBeInTheDocument();

    const calls = routineCallsFor(seen, 1);
    expect(calls.length).toBeGreaterThan(0);
    expect(calls.every((call) => call.method === 'GET')).toBe(true);
    expect(calls[0]?.searchParams.get('from')).toBe(dayjs().startOf('month').format('YYYY-MM-DD'));
    expect(calls[0]?.searchParams.get('to')).toBe(dayjs().endOf('month').format('YYYY-MM-DD'));
    expect(seen.some((call) => call.method === 'PUT' || call.method === 'POST')).toBe(false);
  });

  it('shows an empty state when the selected range has no sent entries', async () => {
    stubChildren([child(1, 'Pedro Silva')]);
    server.use(http.get(apiUrl(ROUTINE_PATH), () => HttpResponse.json({ data: [] })));

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Nenhuma rotina enviada' })).toBeInTheDocument();
    expect(screen.queryByText(DRAFT_NOTES)).not.toBeInTheDocument();
    expect(screen.queryByText(SENT_NOTES)).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Lanche' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Rotina não encontrada' })).not.toBeInTheDocument();
  });

  it('shows not found when the routine of another family child is requested', async () => {
    const seen = recordRequests();
    stubChildren([child(1, 'Pedro Silva')]);

    renderPage('?student=99');

    expect(await screen.findByRole('heading', { name: 'Rotina não encontrada' })).toBeInTheDocument();
    expect(screen.getByText('Este estudante não está vinculado à sua família.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Nenhuma rotina enviada' })).not.toBeInTheDocument();
    expect(screen.queryByText(SENT_NOTES)).not.toBeInTheDocument();
    expect(screen.queryByText(DRAFT_NOTES)).not.toBeInTheDocument();
    expect(screen.queryByText(/sono|humor|foto/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Lanche' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Observações' })).not.toBeInTheDocument();

    expect(routineCallsFor(seen, 99).length).toBeGreaterThan(0);
    expect(routineCallsFor(seen, 1)).toEqual([]);
  });

  it('shows a load error when the routine request fails for a reason other than not found', async () => {
    stubChildren([child(1, 'Pedro Silva')]);
    server.use(
      http.get(apiUrl(ROUTINE_PATH), () => jsonError(500, 'internal_error', 'Falhou ao carregar.')),
    );

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Falhou ao carregar.');
    expect(screen.queryByRole('heading', { name: 'Rotina não encontrada' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Nenhuma rotina enviada' })).not.toBeInTheDocument();
  });
});
