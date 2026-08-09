import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, SCHOOL_ID, apiUrl, http, server } from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { setAccessToken } from 'services/tokenStore';
import { Student } from 'types/student';
import StudentFormDialog from './StudentFormDialog';

const STUDENTS_PATH = `/api/v1/schools/${SCHOOL_ID}/people/students`;
const CLASSES_PATH = `/api/v1/schools/${SCHOOL_ID}/academics/school_classes`;

const MOTHER_CPF = '123.456.789-09';
const FATHER_CPF = '158.521.190-75';

const schoolClass = {
  id: 4,
  school_id: SCHOOL_ID,
  name: 'A',
  grade_level: 'fundamental_i_5',
  year: 2026,
  student_count: 0,
  subjects: [],
};

/** The "Turma" select is loaded on mount in every spec here. */
const stubClasses = () =>
  server.use(
    http.get(apiUrl(CLASSES_PATH), () =>
      HttpResponse.json({ data: [schoolClass], meta: { page: 1, per_page: 25, total: 1 } }),
    ),
  );

const VALID_CPF = '529.982.247-25';

const user = userEvent.setup({ delay: null });

const student: Student = {
  id: 12,
  school_id: SCHOOL_ID,
  name: 'Pedro Silva',
  cpf: '52998224725',
  rg: 'MG-14.235.789',
  birth_date: '2015-03-10',
  grade_level: 'fundamental_i_5',
  school_class_id: schoolClass.id,
  school_class_name: 'A',
  guardians: [
    {
      id: 1,
      link_id: 10,
      name: 'Maria Silva',
      cpf: '12345678909',
      relationship: 'mother' as const,
    },
  ],
  status: 'active',
};

const renderDialog = (props: Partial<Parameters<typeof StudentFormDialog>[0]> = {}) => {
  const onSaved = vi.fn();
  const onClose = vi.fn();

  renderWithTheme(
    <StudentFormDialog open schoolId={SCHOOL_ID} onClose={onClose} onSaved={onSaved} {...props} />,
  );

  return { onSaved, onClose };
};

/**
 * One event per field instead of one per keystroke — the form is filled in most specs here.
 * Addressed by id rather than label: the form has three CPF fields, and "CPF" is a prefix of
 * "CPF do pai" and "CPF da mãe".
 */
const setField = (field: string, value: string) => {
  const input = document.getElementById(`student-${field}`) as HTMLInputElement;
  fireEvent.change(input, { target: { value } });
};

const fieldValue = (field: string) =>
  (document.getElementById(`student-${field}`) as HTMLInputElement).value;

const fillRequiredFields = () => {
  setField('name', 'Pedro Silva');
  setField('cpf', VALID_CPF);
  setField('rg', 'MG-14.235.789');
  setField('birth_date', '2015-03-10');
  // A student needs at least one parent, identified by an already-registered CPF.
  setField('mother_cpf', MOTHER_CPF);
};

const selectClass = async () => {
  await user.click(await screen.findByRole('combobox', { name: /turma/i }));
  await user.click(screen.getByRole('option', { name: /5º ano A — 2026/ }));
};

const authenticate = () => setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');

describe('StudentFormDialog', () => {
  it('sends the enrolment details with every CPF as bare digits', async () => {
    authenticate();
    stubClasses();

    let received: unknown;
    server.use(
      http.post(apiUrl(STUDENTS_PATH), async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ data: student }, { status: 201 });
      }),
    );

    const { onSaved } = renderDialog();

    fillRequiredFields();
    await selectClass();
    await user.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));

    expect(received).toEqual({
      student: {
        name: 'Pedro Silva',
        cpf: '52998224725',
        rg: 'MG-14.235.789',
        birth_date: '2015-03-10',
        school_class_id: schoolClass.id,
        father_cpf: null,
        mother_cpf: '12345678909',
      },
    });
  });

  it('sends both parents when both CPFs are given', async () => {
    authenticate();
    stubClasses();

    let received: { student: Record<string, unknown> } | undefined;
    server.use(
      http.post(apiUrl(STUDENTS_PATH), async ({ request }) => {
        received = (await request.json()) as { student: Record<string, unknown> };
        return HttpResponse.json({ data: student }, { status: 201 });
      }),
    );

    const { onSaved } = renderDialog();

    fillRequiredFields();
    setField('father_cpf', FATHER_CPF);
    await selectClass();
    await user.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(received?.student.father_cpf).toBe('15852119075');
    expect(received?.student.mother_cpf).toBe('12345678909');
  });

  // The cohort carries the grade, so the option must name both — "A" alone says nothing.
  it('offers the cohorts with their grade and year', async () => {
    stubClasses();
    renderDialog();

    await user.click(await screen.findByRole('combobox', { name: /turma/i }));

    expect(
      screen.getByRole('option', { name: 'Ensino Fundamental I — 5º ano A — 2026' }),
    ).toBeInTheDocument();
  });

  describe('client-side rules that spare a round trip', () => {
    it.each([
      [/informe o nome/i],
      [/^informe o cpf\.$/i],
      [/informe o rg/i],
      [/informe a data de nascimento/i],
      [/selecione a turma/i],
    ])('reports %s when the form is empty', async (message) => {
      stubClasses();
      const { onSaved } = renderDialog();

      await user.click(screen.getByRole('button', { name: /salvar/i }));

      expect(await screen.findByText(message)).toBeInTheDocument();
      expect(onSaved).not.toHaveBeenCalled();
    });

    // A student with no responsible adult on file cannot be billed or contacted.
    it('requires at least one parent CPF', async () => {
      stubClasses();
      const { onSaved } = renderDialog();

      setField('name', 'Pedro Silva');
      setField('cpf', VALID_CPF);
      setField('rg', 'MG-14.235.789');
      setField('birth_date', '2015-03-10');
      await selectClass();
      await user.click(screen.getByRole('button', { name: /salvar/i }));

      expect(await screen.findAllByText(/informe o cpf do pai ou da mãe/i)).toHaveLength(2);
      expect(onSaved).not.toHaveBeenCalled();
    });

    it('rejects a parent CPF whose check digits do not match', async () => {
      stubClasses();
      const { onSaved } = renderDialog();

      fillRequiredFields();
      setField('mother_cpf', '123.456.789-00');
      await selectClass();
      await user.click(screen.getByRole('button', { name: /salvar/i }));

      expect(await screen.findByText(/cpf inválido/i)).toBeInTheDocument();
      expect(onSaved).not.toHaveBeenCalled();
    });

    it('rejects the same CPF for both parents', async () => {
      stubClasses();
      const { onSaved } = renderDialog();

      fillRequiredFields();
      setField('father_cpf', MOTHER_CPF);
      await selectClass();
      await user.click(screen.getByRole('button', { name: /salvar/i }));

      expect(await screen.findByText(/mesmo cpf já foi informado/i)).toBeInTheDocument();
      expect(onSaved).not.toHaveBeenCalled();
    });

    it('rejects a CPF whose check digits do not match', async () => {
      stubClasses();
      const { onSaved } = renderDialog();

      fillRequiredFields();
      setField('cpf', '123.456.789-00');
      await selectClass();
      await user.click(screen.getByRole('button', { name: /salvar/i }));

      expect(await screen.findByText(/cpf inválido/i)).toBeInTheDocument();
      expect(onSaved).not.toHaveBeenCalled();
    });

    it('rejects a birth date in the future', async () => {
      stubClasses();
      const { onSaved } = renderDialog();

      fillRequiredFields();
      setField('birth_date', '2999-01-01');
      await selectClass();
      await user.click(screen.getByRole('button', { name: /salvar/i }));

      expect(await screen.findByText(/deve estar no passado/i)).toBeInTheDocument();
      expect(onSaved).not.toHaveBeenCalled();
    });
  });

  it('shows a duplicate-CPF rejection from the API under the CPF field', async () => {
    authenticate();
    stubClasses();

    server.use(
      http.post(apiUrl(STUDENTS_PATH), () =>
        HttpResponse.json(
          {
            error: {
              code: 'validation_error',
              message: 'Dados inválidos.',
              details: { cpf: ['já está em uso'] },
            },
          },
          { status: 422 },
        ),
      ),
    );

    const { onSaved } = renderDialog();

    fillRequiredFields();
    await selectClass();
    await user.click(screen.getByRole('button', { name: /salvar/i }));

    expect(await screen.findByText('já está em uso')).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });

  // The API names the CPF that matched no guardian, against the field it came from.
  it('shows an unknown parent CPF under that parent field', async () => {
    authenticate();
    stubClasses();

    server.use(
      http.post(apiUrl(STUDENTS_PATH), () =>
        HttpResponse.json(
          {
            error: {
              code: 'validation_error',
              message: 'Dados inválidos.',
              details: {
                mother_cpf: ['Nenhum responsável cadastrado com o CPF 123.456.789-09.'],
              },
            },
          },
          { status: 422 },
        ),
      ),
    );

    const { onSaved } = renderDialog();

    fillRequiredFields();
    await selectClass();
    await user.click(screen.getByRole('button', { name: /salvar/i }));

    expect(await screen.findByText(/nenhum responsável cadastrado com o cpf/i)).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('sends an edit as a PATCH, pre-filled with the stored values formatted', async () => {
    authenticate();
    stubClasses();

    let method = '';
    server.use(
      http.patch(apiUrl(`${STUDENTS_PATH}/${student.id}`), ({ request }) => {
        method = request.method;
        return HttpResponse.json({ data: student });
      }),
    );

    const { onSaved } = renderDialog({ student });

    expect(fieldValue('name')).toBe('Pedro Silva');
    expect(fieldValue('cpf')).toBe(VALID_CPF);
    expect(fieldValue('birth_date')).toBe('2015-03-10');
    // The mother's CPF comes back from the guardian links, masked.
    expect(fieldValue('mother_cpf')).toBe(MOTHER_CPF);

    await user.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(method).toBe('PATCH');
  });
});
