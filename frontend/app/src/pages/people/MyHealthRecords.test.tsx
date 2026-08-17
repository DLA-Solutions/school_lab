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
import MyHealthRecords from './MyHealthRecords';

const user = userEvent.setup({ delay: null });

const STUDENTS_PATH = `/api/v1/schools/${SCHOOL_ID}/me/students`;
const sheetPath = (id: number) => `/api/v1/schools/${SCHOOL_ID}/me/students/${id}/health_record`;

const child = (id: number, name: string) => ({ id, school_id: SCHOOL_ID, name });

const stubChildren = (rows: ReturnType<typeof child>[]) =>
  server.use(
    http.get(apiUrl(STUDENTS_PATH), () =>
      HttpResponse.json({ data: rows, meta: { page: 1, per_page: 25, total: rows.length } }),
    ),
  );

const stubSheet = (id: number, filled: boolean) =>
  server.use(
    http.get(apiUrl(sheetPath(id)), () =>
      HttpResponse.json({
        data: {
          id: filled ? 1 : null,
          student_id: id,
          student_name: null,
          content: filled ? 'Alérgica a amendoim.' : '',
          content_updated_at: filled ? '2026-08-17T12:00:00Z' : null,
          updated_by_name: filled ? 'carol@example.com' : null,
          filled,
        },
      }),
    ),
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
    stubSheet(1, true);
    stubSheet(2, false);

    renderWithTheme(<MyHealthRecords />);

    expect(await screen.findByText('Mariana Sales')).toBeInTheDocument();
    expect(screen.getByText('Pedro Sales')).toBeInTheDocument();
  });

  // The family's first question here is which sheets are still blank.
  it('says which sheets are still empty', async () => {
    stubChildren([child(1, 'Mariana Sales'), child(2, 'Pedro Sales')]);
    stubSheet(1, true);
    stubSheet(2, false);

    renderWithTheme(<MyHealthRecords />);

    expect(await screen.findByText('Preenchida')).toBeInTheDocument();
    expect(screen.getByText('Não preenchida')).toBeInTheDocument();
  });

  it('opens the sheet of the child chosen', async () => {
    stubChildren([child(1, 'Mariana Sales')]);
    stubSheet(1, true);

    renderWithTheme(<MyHealthRecords />);

    await user.click(
      await screen.findByRole('button', { name: 'Ficha de saúde de Mariana Sales' }),
    );

    expect(await screen.findByDisplayValue('Alérgica a amendoim.')).toBeInTheDocument();
  });

  it('says plainly when no child is linked', async () => {
    stubChildren([]);

    renderWithTheme(<MyHealthRecords />);

    expect(await screen.findByText('Nenhum filho vinculado ao seu cadastro.')).toBeInTheDocument();
  });

  // One unreadable sheet should not hide the other children.
  it('still lists a child whose sheet could not be read', async () => {
    stubChildren([child(1, 'Mariana Sales')]);
    server.use(http.get(apiUrl(sheetPath(1)), () => HttpResponse.error()));

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
});
