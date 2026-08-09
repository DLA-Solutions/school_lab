import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, SCHOOL_ID, apiUrl, http, server } from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { setAccessToken } from 'services/tokenStore';
import { SchoolClass, Subject, Teacher } from 'types/academics';
import TeacherAssignmentsDialog from './TeacherAssignmentsDialog';

const ACADEMICS = `/api/v1/schools/${SCHOOL_ID}/academics`;

const user = userEvent.setup({ delay: null });

const page = <T,>(data: T[]) => ({ data, meta: { page: 1, per_page: 25, total: data.length } });

const fifthA: SchoolClass = {
  id: 4,
  school_id: SCHOOL_ID,
  name: 'A',
  grade_level: 'fundamental_i_5',
  year: 2026,
  student_count: 12,
  subjects: [],
};

const seventhB: SchoolClass = { ...fifthA, id: 5, name: 'B', grade_level: 'fundamental_ii_7' };

const maths: Subject = { id: 1, school_id: SCHOOL_ID, name: 'Matemática' };
const science: Subject = { id: 2, school_id: SCHOOL_ID, name: 'Ciências' };

/** A teacher already holding two subjects in one class and one in another. */
const teacher: Teacher = {
  id: 9,
  school_id: SCHOOL_ID,
  name: 'Carla Nogueira',
  cpf: '15852119075',
  email: 'carla@example.com',
  phone: null,
  classes: [
    {
      id: fifthA.id,
      name: 'A',
      grade_level: 'fundamental_i_5',
      year: 2026,
      subjects: [
        { id: maths.id, name: 'Matemática', assignment_id: 100 },
        { id: science.id, name: 'Ciências', assignment_id: 101 },
      ],
    },
    {
      id: seventhB.id,
      name: 'B',
      grade_level: 'fundamental_ii_7',
      year: 2026,
      subjects: [{ id: maths.id, name: 'Matemática', assignment_id: 102 }],
    },
  ],
};

const stubOptions = () =>
  server.use(
    http.get(apiUrl(`${ACADEMICS}/school_classes`), () =>
      HttpResponse.json(page([fifthA, seventhB])),
    ),
    http.get(apiUrl(`${ACADEMICS}/subjects`), () => HttpResponse.json(page([maths, science]))),
  );

const renderDialog = (override?: Partial<Teacher>) => {
  const onClose = vi.fn();
  const onChanged = vi.fn();

  renderWithTheme(
    <TeacherAssignmentsDialog
      open
      schoolId={SCHOOL_ID}
      teacher={{ ...teacher, ...override }}
      onClose={onClose}
      onChanged={onChanged}
    />,
  );

  return { onClose, onChanged };
};

const authenticate = () => setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');

describe('TeacherAssignmentsDialog', () => {
  // The whole point of the screen: from the class, the subjects taught there.
  it('groups the subjects under each class the teacher works in', () => {
    authenticate();
    stubOptions();
    renderDialog();

    expect(screen.getByText('Ensino Fundamental I — 5º ano A — 2026')).toBeInTheDocument();
    expect(screen.getByText('Ensino Fundamental II — 7º ano B — 2026')).toBeInTheDocument();

    // Matemática appears in both classes; Ciências only in the first.
    expect(screen.getAllByText('Matemática')).toHaveLength(2);
    expect(screen.getAllByText('Ciências')).toHaveLength(1);
  });

  it('assigns a class and a subject and shows what came back', async () => {
    authenticate();
    stubOptions();

    let received: unknown;
    server.use(
      http.post(apiUrl(`${ACADEMICS}/teachers/${teacher.id}/teaching_assignments`), async ({ request }) => {
        received = await request.json();
        return HttpResponse.json(
          {
            data: {
              ...teacher,
              classes: [
                {
                  id: seventhB.id,
                  name: 'B',
                  grade_level: 'fundamental_ii_7',
                  year: 2026,
                  subjects: [{ id: science.id, name: 'Ciências', assignment_id: 103 }],
                },
              ],
            },
          },
          { status: 201 },
        );
      }),
    );

    const { onChanged } = renderDialog({ classes: [] });

    await user.click(await screen.findByRole('combobox', { name: /turma/i }));
    await user.click(screen.getByRole('option', { name: 'Ensino Fundamental II — 7º ano B — 2026' }));
    await user.click(screen.getByRole('combobox', { name: /matéria/i }));
    await user.click(screen.getByRole('option', { name: 'Ciências' }));
    await user.click(screen.getByRole('button', { name: /atribuir/i }));

    await waitFor(() => expect(received).toBeDefined());

    expect(received).toEqual({
      teaching_assignment: { school_class_id: seventhB.id, subject_id: science.id },
    });
    // The listing behind the dialog needs to pick the change up too.
    await waitFor(() => expect(onChanged).toHaveBeenCalled());

    // The cohort now heads the assignment list. Its label also sits in the select's own value, so
    // this looks for the occurrence that is not the combobox.
    const labels = await screen.findAllByText('Ensino Fundamental II — 7º ano B — 2026');
    expect(labels.some((element) => element.getAttribute('role') !== 'combobox')).toBe(true);
  });

  it('requires both a class and a subject', async () => {
    authenticate();
    stubOptions();
    renderDialog({ classes: [] });

    await user.click(await screen.findByRole('button', { name: /atribuir/i }));

    expect(await screen.findByText(/selecione a turma e a matéria/i)).toBeInTheDocument();
  });

  it('reports a duplicate assignment from the API', async () => {
    authenticate();
    stubOptions();

    server.use(
      http.post(apiUrl(`${ACADEMICS}/teachers/${teacher.id}/teaching_assignments`), () =>
        HttpResponse.json(
          {
            error: {
              code: 'validation_error',
              message: 'Dados inválidos.',
              details: { school_class_id: ['já está em uso'] },
            },
          },
          { status: 422 },
        ),
      ),
    );

    renderDialog();

    await user.click(await screen.findByRole('combobox', { name: /turma/i }));
    await user.click(screen.getByRole('option', { name: 'Ensino Fundamental I — 5º ano A — 2026' }));
    await user.click(screen.getByRole('combobox', { name: /matéria/i }));
    await user.click(screen.getByRole('option', { name: 'Matemática' }));
    await user.click(screen.getByRole('button', { name: /atribuir/i }));

    expect(await screen.findByText(/já está em uso/i)).toBeInTheDocument();
  });

  it('removes a subject and drops the class once it holds none', async () => {
    authenticate();
    stubOptions();

    let deletedId: number | null = null;
    server.use(
      http.delete(apiUrl(`${ACADEMICS}/teaching_assignments/102`), () => {
        deletedId = 102;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const { onChanged } = renderDialog();

    // 7º ano B holds a single subject, so removing it removes the class from the list.
    const seventh = screen.getByText('Ensino Fundamental II — 7º ano B — 2026').closest('div');
    await user.click(within(seventh as HTMLElement).getByTestId('CancelIcon'));

    await waitFor(() => expect(deletedId).toBe(102));
    await waitFor(() =>
      expect(screen.queryByText('Ensino Fundamental II — 7º ano B — 2026')).not.toBeInTheDocument(),
    );
    expect(screen.getByText('Ensino Fundamental I — 5º ano A — 2026')).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalled();
  });

  it('says what is missing when the school has no classes or subjects yet', async () => {
    authenticate();
    server.use(
      http.get(apiUrl(`${ACADEMICS}/school_classes`), () => HttpResponse.json(page([]))),
      http.get(apiUrl(`${ACADEMICS}/subjects`), () => HttpResponse.json(page([]))),
    );

    renderDialog({ classes: [] });

    expect(await screen.findByText(/nenhuma turma cadastrada/i)).toBeInTheDocument();
    expect(screen.getByText(/nenhuma matéria cadastrada/i)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /atribuir/i })).toBeDisabled(),
    );
  });
});
