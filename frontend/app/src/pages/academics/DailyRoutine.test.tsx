import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { HttpResponse, SCHOOL_ID, apiUrl, http, server, staffMembership } from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { setAccessToken } from 'services/tokenStore';
import { Membership } from 'types/auth';
import { SchoolClass } from 'types/academics';
import { DailyRoutine } from 'types/dailyRoutine';
import DailyRoutinePage from './DailyRoutine';

const ACADEMICS = `/api/v1/schools/${SCHOOL_ID}/academics`;
const COMM = `/api/v1/schools/${SCHOOL_ID}/communication`;
const STUDENTS = `/api/v1/schools/${SCHOOL_ID}/people/students`;

const user = userEvent.setup({ delay: null });

const teacherMembership: Membership = {
  ...staffMembership,
  id: 15,
  role: 'teacher',
  permissions: ['teach'],
  permission_sources: { teach: 'template' },
};

const coordinatorMembership: Membership = {
  ...staffMembership,
  permissions: ['manage_academic', 'manage_people', 'manage_enrollment'],
  permission_sources: {
    manage_academic: 'template',
    manage_people: 'template',
    manage_enrollment: 'template',
  },
};

const infantil: SchoolClass = {
  id: 8,
  school_id: SCHOOL_ID,
  name: 'A',
  grade_level: 'infantil_1',
  shift: 'matutino',
  year: 2026,
  student_count: 3,
  subjects: [],
};

const fundamental: SchoolClass = {
  ...infantil,
  id: 4,
  grade_level: 'fundamental_i_5',
  name: 'B',
};

const threads = [
  { student_id: 9, student_name: 'Ana Lima', school_class_id: 8, conversation_id: null, last_message_at: null },
  { student_id: 10, student_name: 'Pedro Lima', school_class_id: 8, conversation_id: 1, last_message_at: null },
  { student_id: 11, student_name: 'Lia Lima', school_class_id: 8, conversation_id: 2, last_message_at: null },
];

const routine = (overrides: Partial<DailyRoutine>): DailyRoutine => ({
  id: 5,
  student_id: 10,
  school_class_id: 8,
  date: '2026-10-04',
  status: 'draft',
  narrative: null,
  sleep_morning: null,
  sleep_after_lunch: null,
  sleep_afternoon: null,
  interaction: null,
  evacuation: null,
  discomfort: null,
  discomfort_detail: null,
  meal_breakfast: null,
  meal_lunch: null,
  meal_afternoon_snack: null,
  meal_dinner: null,
  meal_hydration: null,
  attachment_ids: [],
  ...overrides,
});

const page = <T,>(rows: T[]) => ({
  data: rows,
  meta: { page: 1, per_page: 100, total: rows.length },
});

interface Sent {
  method: string;
  path: string;
  body: Record<string, unknown> | null;
}

const stub = (options?: { classes?: SchoolClass[]; routines?: DailyRoutine[] }) => {
  const sent: Sent[] = [];
  const routines = options?.routines ?? [
    routine({ id: 5, student_id: 10, status: 'draft' }),
    routine({
      id: 6,
      student_id: 11,
      status: 'sent',
      narrative: 'Dormiu depois do almoço.',
      sent_at: '2026-10-04T18:00:00Z',
    }),
  ];

  server.use(
    http.get(apiUrl(`${ACADEMICS}/school_classes`), () =>
      HttpResponse.json(page(options?.classes ?? [infantil])),
    ),
    http.get(apiUrl(`${COMM}/conversations`), () => HttpResponse.json(page(threads))),
    http.get(apiUrl(`${ACADEMICS}/daily_routines`), () => HttpResponse.json(page(routines))),
    http.put(apiUrl(`${ACADEMICS}/daily_routines`), async ({ request }) => {
      const body = (await request.json()) as { daily_routine: Record<string, unknown> };
      sent.push({ method: 'PUT', path: 'daily_routines', body: body.daily_routine });
      const studentId = body.daily_routine.student_id;
      return HttpResponse.json({
        data: routine({
          id: studentId === 11 ? 6 : 7,
          student_id: Number(studentId),
          status: studentId === 11 ? 'sent' : 'draft',
          narrative: String(body.daily_routine.narrative ?? ''),
        }),
      });
    }),
    http.post(apiUrl(`${ACADEMICS}/daily_routines/:id/send`), ({ params }) => {
      sent.push({ method: 'SEND', path: String(params.id), body: null });
      return HttpResponse.json({ data: routine({ id: Number(params.id), status: 'sent' }) });
    }),
    http.post(apiUrl(`${ACADEMICS}/daily_routines/apply_meals`), async ({ request }) => {
      sent.push({
        method: 'MEALS',
        path: 'apply_meals',
        body: (await request.json()) as Record<string, unknown>,
      });
      return HttpResponse.json({ data: routines });
    }),
  );

  return sent;
};

const renderPage = (membership: Membership = teacherMembership) => {
  setAccessToken('fresh-access-token', '2026-10-04T23:20:00Z');

  return renderWithTheme(
    <MemoryRouter initialEntries={['/academico/rotina']}>
      <DailyRoutinePage />
    </MemoryRouter>,
    { memberships: [membership] },
  );
};

describe('Daily routine, as the Infantil teacher fills it', () => {
  it('opens on a roll of blank, draft, and sent', async () => {
    stub();
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /pedro lima/i })).toHaveTextContent('Rascunho');
    });
    expect(screen.getByRole('button', { name: /ana lima/i })).toHaveTextContent('Em branco');
    expect(screen.getByRole('button', { name: /lia lima/i })).toHaveTextContent('Enviado');
  });

  it('keeps sleep, meals, and signals collapsed, and asks for discomfort only when it is set', async () => {
    stub();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /ana lima/i }));

    expect(screen.getByRole('heading', { name: 'Como foi o dia' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Manhã' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('O que aconteceu')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sono' }));
    expect(screen.getByRole('combobox', { name: 'Manhã' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sinais' }));
    await user.click(screen.getByRole('combobox', { name: 'Mal-estar' }));
    await user.click(await screen.findByRole('option', { name: 'Sim' }));
    expect(screen.getByLabelText(/o que aconteceu/i)).toBeInTheDocument();

    await user.click(screen.getByRole('combobox', { name: 'Mal-estar' }));
    await user.click(await screen.findByRole('option', { name: 'Não' }));
    expect(screen.queryByLabelText(/o que aconteceu/i)).not.toBeInTheDocument();
  });

  it('sends the day to the family in one action and leaves unmarked fields empty', async () => {
    const sent = stub();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /ana lima/i }));
    await user.type(screen.getByLabelText('Relato'), 'Brincou na rodinha.');
    await user.click(screen.getByRole('button', { name: /enviar para a família/i }));

    await waitFor(() => expect(sent.some((call) => call.method === 'SEND')).toBe(true));
    const saved = sent.find((call) => call.method === 'PUT')?.body;
    expect(saved).toMatchObject({
      student_id: 9,
      narrative: 'Brincou na rodinha.',
      sleep_morning: null,
      meal_lunch: null,
      discomfort: null,
      discomfort_detail: null,
    });
    expect(sent.filter((call) => call.method === 'SEND')).toHaveLength(1);
  });

  it('updates a sent day without sending the card again', async () => {
    const sent = stub();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /lia lima/i }));
    await user.click(screen.getByRole('button', { name: /atualizar o dia/i }));

    await waitFor(() => expect(sent.some((call) => call.method === 'PUT')).toBe(true));
    expect(sent.some((call) => call.method === 'SEND')).toBe(false);
  });

  it('applies a meal only where the class is still blank, and does not send', async () => {
    const sent = stub();
    renderPage();

    await screen.findByRole('button', { name: /ana lima/i });
    await user.click(screen.getByRole('button', { name: /aplicar na turma/i }));

    await waitFor(() => expect(sent.some((call) => call.method === 'MEALS')).toBe(true));
    expect(sent.find((call) => call.method === 'MEALS')?.body).toMatchObject({
      school_class_id: 8,
      field: 'meal_lunch',
      value: 'great',
    });
    expect(sent.some((call) => call.method === 'SEND')).toBe(false);
  });

  it('stays closed when the teacher has no Infantil class', async () => {
    stub({ classes: [fundamental] });
    renderPage();

    expect(await screen.findByText('Rotina só no Infantil')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /enviar para a família/i })).not.toBeInTheDocument();
  });
});

describe('Daily routine, as coordination reads it', () => {
  it('shows the day as a story and does not offer the family composer', async () => {
    const sent: string[] = [];

    server.use(
      http.get(apiUrl(`${ACADEMICS}/school_classes`), () => HttpResponse.json(page([infantil]))),
      http.get(apiUrl(STUDENTS), () =>
        HttpResponse.json(
          page([
            {
              id: 11,
              school_id: SCHOOL_ID,
              name: 'Lia Lima',
              cpf: '00000000000',
              rg: '',
              birth_date: '2021-01-01',
              grade_level: 'infantil_1',
              school_class_id: 8,
              school_class_name: 'A',
              guardians: [],
              status: 'active',
              active: true,
            },
            {
              id: 20,
              school_id: SCHOOL_ID,
              name: 'Bruno Fundamental',
              cpf: '00000000000',
              rg: '',
              birth_date: '2016-01-01',
              grade_level: 'fundamental_i_5',
              school_class_id: 4,
              school_class_name: 'B',
              guardians: [],
              status: 'active',
              active: true,
            },
          ]),
        ),
      ),
      http.get(apiUrl(`${ACADEMICS}/daily_routines`), () =>
        HttpResponse.json(
          page([
            routine({
              id: 6,
              student_id: 11,
              status: 'sent',
              narrative: 'Pintou com as mãos.',
              meal_lunch: 'regular',
              sleep_morning: null,
            }),
          ]),
        ),
      ),
      http.post(apiUrl(`${ACADEMICS}/daily_routines/:id/send`), () => {
        sent.push('send');
        return HttpResponse.json({ data: {} });
      }),
    );

    renderPage(coordinatorMembership);

    expect(await screen.findByRole('button', { name: /lia lima/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /bruno fundamental/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /enviar para a família/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /aplicar na turma/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /lia lima/i }));

    expect(await screen.findByText('Pintou com as mãos.')).toBeInTheDocument();
    expect(screen.getByText(/Almoço: Regular/)).toBeInTheDocument();
    expect(screen.queryByText(/^Sono$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Manhã:/)).not.toBeInTheDocument();
    expect(sent).toHaveLength(0);
  });
});
