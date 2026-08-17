import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
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
import MyAuthorizedPickups from './MyAuthorizedPickups';

const user = userEvent.setup({ delay: null });

const STUDENTS_PATH = `/api/v1/schools/${SCHOOL_ID}/me/students`;
const pickupsPath = (id: number) =>
  `/api/v1/schools/${SCHOOL_ID}/me/students/${id}/authorized_pickups`;

const child = (id: number, name: string) => ({ id, school_id: SCHOOL_ID, name });

const pickup = (studentId: number) => ({
  id: 1,
  student_id: studentId,
  name: 'Avó Marta',
  cpf: '52998224725',
  phone: null,
  has_photo: false,
  photo_url: null,
  created_by_name: 'carol@example.com',
  created_at: '2026-08-17T12:00:00Z',
});

const stubChildren = (rows: ReturnType<typeof child>[]) =>
  server.use(
    http.get(apiUrl(STUDENTS_PATH), () =>
      HttpResponse.json({ data: rows, meta: { page: 1, per_page: 25, total: rows.length } }),
    ),
  );

const stubPickups = (studentId: number, rows: unknown[]) =>
  server.use(http.get(apiUrl(pickupsPath(studentId)), () => HttpResponse.json({ data: rows })));

beforeEach(() => {
  setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);
  vi.spyOn(guardianSchool, 'useGuardianSchool').mockReturnValue({
    school_id: SCHOOL_ID,
  } as ReturnType<typeof guardianSchool.useGuardianSchool>);
});

describe('MyAuthorizedPickups', () => {
  it('lists every child the family answers for', async () => {
    stubChildren([child(1, 'Mariana Sales'), child(2, 'Pedro Sales')]);
    stubPickups(1, [pickup(1)]);
    stubPickups(2, []);

    renderWithTheme(<MyAuthorizedPickups />);

    expect(await screen.findByText('Mariana Sales')).toBeInTheDocument();
    expect(screen.getByText('Pedro Sales')).toBeInTheDocument();
  });

  // The family's first question here is which children still have nobody on the list.
  it('says which children have nobody authorised yet', async () => {
    stubChildren([child(1, 'Mariana Sales'), child(2, 'Pedro Sales')]);
    stubPickups(1, [pickup(1)]);
    stubPickups(2, []);

    renderWithTheme(<MyAuthorizedPickups />);

    expect(await screen.findByText('1 autorizada(s)')).toBeInTheDocument();
    expect(screen.getByText('Ninguém autorizado ainda')).toBeInTheDocument();
  });

  it('opens the list of the child chosen', async () => {
    stubChildren([child(1, 'Mariana Sales')]);
    stubPickups(1, [pickup(1)]);

    renderWithTheme(<MyAuthorizedPickups />);

    await user.click(
      await screen.findByRole('button', { name: 'Pessoas autorizadas a buscar Mariana Sales' }),
    );

    expect(await screen.findByRole('button', { name: 'Autorizar' })).toBeInTheDocument();
  });

  it('says plainly when no child is linked', async () => {
    stubChildren([]);

    renderWithTheme(<MyAuthorizedPickups />);

    expect(await screen.findByText('Nenhum filho vinculado ao seu cadastro.')).toBeInTheDocument();
  });

  // One unreadable list should not hide the other children.
  it('still lists a child whose list could not be read', async () => {
    stubChildren([child(1, 'Mariana Sales')]);
    server.use(http.get(apiUrl(pickupsPath(1)), () => HttpResponse.error()));

    renderWithTheme(<MyAuthorizedPickups />);

    expect(await screen.findByText('Mariana Sales')).toBeInTheDocument();
  });

  it('says so when the children cannot be loaded', async () => {
    server.use(http.get(apiUrl(STUDENTS_PATH), () => HttpResponse.error()));

    renderWithTheme(<MyAuthorizedPickups />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar seus filhos.',
    );
  });
});
