import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
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
import { Guardian } from 'types/guardian';
import { Student } from 'types/student';
import GuardianDetailsDialog from './GuardianDetailsDialog';

const STUDENTS_PATH = `/api/v1/schools/${SCHOOL_ID}/people/students`;

const guardian = {
  id: 7,
  school_id: SCHOOL_ID,
  user_id: null,
  active: true,
  name: 'Carolina Sales Batista',
  cpf: '01817750186',
  email: 'carol@example.com',
  phone: '62982303184',
  zip_code: '74210150',
  street: 'Rua T44',
  number: '50',
  complement: null,
  neighborhood: 'Setor Bueno',
  city: 'Goiânia',
  state: 'GO',
} as Guardian;

const student = (overrides: Partial<Student> = {}): Student =>
  ({
    id: 1,
    school_id: SCHOOL_ID,
    name: 'Pedro Sales',
    cpf: '12345678909',
    rg: '',
    birth_date: '2015-03-10',
    grade_level: null,
    school_class_id: 3,
    school_class_name: '5º ano A',
    guardians: [],
    status: 'active',
    active: true,
    ...overrides,
  }) as Student;

const stubChildren = (rows: Student[]) => {
  const seen: URL[] = [];

  server.use(
    http.get(apiUrl(STUDENTS_PATH), ({ request }) => {
      seen.push(new URL(request.url));

      return HttpResponse.json({
        data: rows,
        meta: { page: 1, per_page: 25, total: rows.length },
      });
    }),
  );

  return seen;
};

const renderDialog = (open = true) => {
  setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);

  return renderWithTheme(
    <GuardianDetailsDialog open={open} guardian={guardian} onClose={vi.fn()} />,
  );
};

describe('GuardianDetailsDialog', () => {
  it('names the children this guardian answers for', async () => {
    stubChildren([student(), student({ id: 2, name: 'Ana Sales', school_class_name: '2º ano B' })]);

    renderDialog();

    expect(await screen.findByText('Pedro Sales')).toBeInTheDocument();
    expect(screen.getByText('Ana Sales')).toBeInTheDocument();
  });

  // Two children of the same family often share a surname; the class is what tells them apart.
  it('says which class each child is in', async () => {
    stubChildren([student()]);

    renderDialog();

    expect(await screen.findByText('5º ano A')).toBeInTheDocument();
  });

  it('says so when a child is in no class', async () => {
    stubChildren([student({ school_class_name: null })]);

    renderDialog();

    expect(await screen.findByText('Sem turma')).toBeInTheDocument();
  });

  it('asks only for the children linked to this guardian', async () => {
    const seen = stubChildren([student()]);

    renderDialog();
    await screen.findByText('Pedro Sales');

    expect(seen[0].searchParams.get('guardian_id')).toBe(String(guardian.id));
  });

  // A child taken off the roll is still who this person answers for. Dropping them silently
  // would read as the link having been lost.
  it('keeps a child who is no longer on the roll, marked as such', async () => {
    const seen = stubChildren([student({ active: false })]);

    renderDialog();

    expect(await screen.findByText('Pedro Sales')).toBeInTheDocument();
    expect(screen.getByText('Inativos')).toBeInTheDocument();
    expect(seen[0].searchParams.get('status')).toBe('all');
  });

  it('says plainly when there is no child linked', async () => {
    stubChildren([]);

    renderDialog();

    expect(
      await screen.findByText('Nenhum aluno vinculado a este responsável.'),
    ).toBeInTheDocument();
  });

  it('says the children could not be loaded rather than showing none', async () => {
    server.use(http.get(apiUrl(STUDENTS_PATH), () => HttpResponse.error()));

    renderDialog();

    expect(await screen.findByText('Não foi possível carregar os filhos.')).toBeInTheDocument();
    expect(screen.queryByText(/Nenhum aluno vinculado/)).not.toBeInTheDocument();
  });

  it('asks for nothing while it is closed', async () => {
    const seen = stubChildren([student()]);

    renderDialog(false);

    expect(seen).toHaveLength(0);
  });
});
