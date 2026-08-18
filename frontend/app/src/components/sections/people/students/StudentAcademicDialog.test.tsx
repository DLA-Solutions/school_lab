import { beforeEach, describe, expect, it, vi } from 'vitest';
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
import StudentAcademicDialog from './StudentAcademicDialog';

const user = userEvent.setup({ delay: null });

const STUDENT_ID = 12;
const YEARS_PATH = `/api/v1/schools/${SCHOOL_ID}/school_years`;
const PERIODS_PATH = `${YEARS_PATH}/7/academic_periods`;
const CARDS_PATH = `/api/v1/schools/${SCHOOL_ID}/academics/report_card_publications`;
const REPORTS_PATH = `/api/v1/schools/${SCHOOL_ID}/academics/preceptorship_reports`;

const year = {
  id: 7,
  school_id: SCHOOL_ID,
  name: '2026',
  starts_on: '2026-02-01',
  ends_on: '2026-12-15',
  status: 'active',
};

const term = (id: number, name: string, sequence: number) => ({
  id,
  name,
  sequence,
  starts_on: '2026-02-01',
  ends_on: '2026-04-01',
  closure_status: 'open',
});

const card = (overrides: Record<string, unknown> = {}) => ({
  publication_id: 100,
  student_id: STUDENT_ID,
  academic_period_id: 1,
  academic_period_name: '1º bimestre',
  snapshot_id: 500,
  version: 1,
  released_at: '2026-05-02T12:00:00Z',
  pdf_url: `/api/v1/schools/${SCHOOL_ID}/academics/report_card_publications/100/snapshots/500/pdf`,
  ...overrides,
});

const report = (overrides: Record<string, unknown> = {}) => ({
  id: 900,
  school_id: SCHOOL_ID,
  status: 'published',
  body: 'Mariana está indo muito bem em leitura.',
  published_at: '2026-05-10T12:00:00Z',
  created_at: '2026-05-09T12:00:00Z',
  updated_at: '2026-05-10T12:00:00Z',
  student_id: STUDENT_ID,
  teacher_id: 3,
  academic_period_id: 1,
  student_name: 'Mariana Sales',
  teacher_name: 'Prof. Ana',
  period_name: '1º bimestre',
  editable: false,
  ...overrides,
});

const page = <T,>(data: T[]) => ({ data, meta: { page: 1, per_page: 25, total: data.length } });

const stubCalendar = () =>
  server.use(
    http.get(apiUrl(YEARS_PATH), () => HttpResponse.json(page([year]))),
    http.get(apiUrl(PERIODS_PATH), () =>
      HttpResponse.json({ data: [term(1, '1º bimestre', 1), term(2, '2º bimestre', 2)] }),
    ),
  );

const stubCards = (rows: unknown[]) => {
  const seen: URL[] = [];

  server.use(
    http.get(apiUrl(CARDS_PATH), ({ request }) => {
      seen.push(new URL(request.url));
      return HttpResponse.json(page(rows));
    }),
  );

  return seen;
};

const stubReports = (rows: unknown[]) => {
  const seen: URL[] = [];

  server.use(
    http.get(apiUrl(REPORTS_PATH), ({ request }) => {
      seen.push(new URL(request.url));
      return HttpResponse.json(page(rows));
    }),
  );

  return seen;
};

beforeEach(() => {
  setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);
  stubCalendar();
});

const renderDialog = (props: Partial<Parameters<typeof StudentAcademicDialog>[0]> = {}) =>
  renderWithTheme(
    <StudentAcademicDialog
      open
      schoolId={SCHOOL_ID}
      studentId={STUDENT_ID}
      studentName="Mariana Sales"
      onClose={vi.fn()}
      {...props}
    />,
  );

describe('StudentAcademicDialog, the report card tab', () => {
  it('lists what was published for the student, naming the term', async () => {
    stubCards([card()]);
    stubReports([]);

    renderDialog();

    expect(await screen.findByText('1º bimestre')).toBeInTheDocument();
    expect(screen.getByText(/Publicado em/)).toBeInTheDocument();
  });

  it('asks only about this student', async () => {
    const seen = stubCards([card()]);
    stubReports([]);

    renderDialog();
    await screen.findByText('1º bimestre');

    expect(seen[0].searchParams.get('student_id')).toBe(String(STUDENT_ID));
  });

  // A register spanning several years otherwise opens on a wall of every boletim the child had.
  it('narrows to one term when the school picks one', async () => {
    const seen = stubCards([card()]);
    stubReports([]);

    renderDialog();
    await screen.findByText('1º bimestre');

    // The term select only fills once the years have answered and one is chosen.
    const terms = screen.getByRole('combobox', { name: 'Bimestre' });
    await waitFor(() => expect(terms).not.toHaveAttribute('aria-disabled', 'true'));

    await user.click(terms);
    await user.click(await screen.findByRole('option', { name: '2º bimestre' }));

    await waitFor(() =>
      expect(seen[seen.length - 1]?.searchParams.get('academic_period_id')).toBe('2'),
    );
  });

  // With no term chosen the year still bounds the answer, or "all terms" would quietly mean
  // every term of every year the child was ever enrolled.
  it('keeps to the chosen year when no term is picked', async () => {
    const seen = stubCards([card()]);
    stubReports([]);

    renderDialog();
    await screen.findByText('1º bimestre');

    await waitFor(() => expect(seen[seen.length - 1]?.searchParams.get('school_year_id')).toBe('7'));
    expect(seen[seen.length - 1]?.searchParams.get('academic_period_id')).toBeNull();
  });

  it('opens on the most recent school year', async () => {
    stubCards([card()]);
    stubReports([]);

    renderDialog();

    expect(await screen.findByRole('combobox', { name: 'Ano letivo' })).toHaveTextContent('2026');
  });

  it('downloads the boletim of the version in force', async () => {
    stubCards([card()]);
    stubReports([]);
    server.use(
      http.get(apiUrl(`${CARDS_PATH}/100/snapshots/500/pdf`), () =>
        HttpResponse.arrayBuffer(new TextEncoder().encode('%PDF-1.4').buffer, {
          headers: { 'Content-Type': 'application/pdf' },
        }),
      ),
    );
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock/1');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    renderDialog();

    await user.click(await screen.findByRole('button', { name: 'Baixar PDF' }));

    await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
    vi.restoreAllMocks();
  });

  it('cannot download a boletim with no version released', async () => {
    stubCards([card({ snapshot_id: null, released_at: null, version: null })]);
    stubReports([]);

    renderDialog();

    expect(await screen.findByText('Ainda não publicado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Baixar PDF' })).toBeDisabled();
  });

  it('says plainly when nothing was published', async () => {
    stubCards([]);
    stubReports([]);

    renderDialog();

    expect(await screen.findByText('Nenhum boletim publicado')).toBeInTheDocument();
  });

  it('says so when the boletins cannot be loaded', async () => {
    server.use(http.get(apiUrl(CARDS_PATH), () => HttpResponse.error()));
    stubReports([]);

    renderDialog();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar os boletins.',
    );
  });
});

describe('StudentAcademicDialog, the preceptorship tab', () => {
  const openTab = async () => {
    renderDialog();
    await user.click(await screen.findByRole('tab', { name: 'Preceptoria' }));
  };

  it('shows what the teachers wrote, in their own words', async () => {
    stubCards([]);
    stubReports([report()]);

    await openTab();

    expect(await screen.findByText('Mariana está indo muito bem em leitura.')).toBeInTheDocument();
    expect(screen.getByText('Prof. Ana')).toBeInTheDocument();
  });

  // A draft is a teacher still thinking; the family has not seen it and neither should this.
  it('leaves drafts out', async () => {
    stubCards([]);
    stubReports([
      report(),
      report({ id: 901, status: 'draft', body: 'rascunho por terminar', published_at: null }),
    ]);

    await openTab();

    await screen.findByText('Mariana está indo muito bem em leitura.');
    expect(screen.queryByText('rascunho por terminar')).not.toBeInTheDocument();
  });

  // Preceptoria is read the same way a boletim is: one child, one year, one bimestre.
  it('keeps to the chosen year when no term is picked', async () => {
    stubCards([]);
    const seen = stubReports([report()]);

    await openTab();
    await screen.findByText('Mariana está indo muito bem em leitura.');

    await waitFor(() => expect(seen[seen.length - 1]?.searchParams.get('school_year_id')).toBe('7'));
    expect(seen[seen.length - 1]?.searchParams.get('student_id')).toBe(String(STUDENT_ID));
  });

  it('narrows to one term when the school picks one', async () => {
    stubCards([]);
    const seen = stubReports([report()]);

    await openTab();
    await screen.findByText('Mariana está indo muito bem em leitura.');

    const terms = screen.getByRole('combobox', { name: 'Bimestre' });
    await waitFor(() => expect(terms).not.toHaveAttribute('aria-disabled', 'true'));

    await user.click(terms);
    await user.click(await screen.findByRole('option', { name: '2º bimestre' }));

    await waitFor(() =>
      expect(seen[seen.length - 1]?.searchParams.get('academic_period_id')).toBe('2'),
    );
    expect(seen[seen.length - 1]?.searchParams.get('school_year_id')).toBeNull();
  });

  it('says plainly when no teacher has published anything', async () => {
    stubCards([]);
    stubReports([report({ status: 'draft', published_at: null })]);

    await openTab();

    expect(await screen.findByText('Nenhum relatório publicado')).toBeInTheDocument();
  });

  it('says so when the preceptorship cannot be loaded', async () => {
    stubCards([]);
    server.use(http.get(apiUrl(REPORTS_PATH), () => HttpResponse.error()));

    await openTab();

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText(/Não foi possível carregar a preceptoria/)).toBeInTheDocument();
  });
});
