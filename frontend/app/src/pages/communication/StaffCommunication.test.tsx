import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import {
  ACCESS_EXPIRES_AT,
  FRESH_ACCESS_TOKEN,
  HttpResponse,
  SCHOOL_ID,
  apiUrl,
  http,
  server,
  staffMembership,
} from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { setAccessToken } from 'services/tokenStore';
import { Membership } from 'types/auth';
import StaffCommunication from './StaffCommunication';

const user = userEvent.setup({ delay: null });

const BASE = `/api/v1/schools/${SCHOOL_ID}/communication`;

const notification = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  kind: 'message',
  title: 'Nova mensagem',
  body: null,
  created_at: '2026-10-06T12:00:00Z',
  read: false,
  school_id: SCHOOL_ID,
  contract_id: null,
  conversation_id: 3,
  ...overrides,
});

const schoolClass = (id: number, shift: 'matutino' | 'vespertino', name: string) => ({
  id,
  school_id: SCHOOL_ID,
  name,
  grade_level: 'fundamental_i_1',
  shift,
  year: 2026,
  student_count: 1,
  subjects: [],
});

const rosterItem = (overrides: Record<string, unknown> = {}) => ({
  student_id: 9,
  student_name: 'Lara Nogueira',
  school_class_id: 310,
  conversation_id: null as number | null,
  sender_line: null as string | null,
  ...overrides,
});

const destination = (
  audience: string,
  teacherId: number | null = null,
  name: string | null = null,
) => ({
  audience,
  teacher_id: teacherId,
  name,
});

const stubInbox = ({
  conversations = [] as Record<string, unknown>[],
  notifications = [] as ReturnType<typeof notification>[],
  classes,
  roster,
}: {
  conversations?: Record<string, unknown>[];
  notifications?: ReturnType<typeof notification>[];
  classes?: ReturnType<typeof schoolClass>[];
  roster?: ReturnType<typeof rosterItem>[];
}) =>
  server.use(
    http.get(apiUrl(`${BASE}/conversations`), () => HttpResponse.json({ data: conversations })),
    http.get(apiUrl(`${BASE}/conversations/:id/messages`), () => HttpResponse.json({ data: [] })),
    http.get(apiUrl('/api/v1/notifications'), () =>
      HttpResponse.json({
        data: notifications,
        meta: {
          page: 1,
          per_page: 25,
          total: notifications.length,
          unread_count: notifications.length,
        },
      }),
    ),
    ...(classes
      ? [
          http.get(apiUrl(`/api/v1/schools/${SCHOOL_ID}/academics/school_classes`), () =>
            HttpResponse.json({
              data: classes,
              meta: { page: 1, per_page: 25, total: classes.length },
            }),
          ),
        ]
      : []),
    ...(roster
      ? [http.get(apiUrl(`${BASE}/roster`), () => HttpResponse.json({ data: roster }))]
      : []),
  );

const sentMessage = (body: string) => ({
  conversation_id: 77,
  message: {
    id: 50,
    sender_membership_id: 11,
    sender_line: 'Secretaria',
    body,
    sent_at: '2026-10-06T12:00:00Z',
  },
});

/** Records the `q` of every `/search` request, in order, and answers with `results`. */
const stubSearch = (results: Record<string, unknown>[] = []) => {
  const queries: string[] = [];

  server.use(
    http.get(apiUrl(`${BASE}/search`), ({ request }) => {
      queries.push(new URL(request.url).searchParams.get('q') ?? '');
      return HttpResponse.json({ data: results });
    }),
  );

  return queries;
};

const captureSend = () => {
  const posts: unknown[] = [];
  const messageIds: string[] = [];

  server.use(
    http.get(apiUrl(`${BASE}/conversations/:id/messages`), ({ params }) => {
      messageIds.push(String(params.id));
      return HttpResponse.json({ data: [] });
    }),
    http.post(apiUrl(`${BASE}/messages`), async ({ request }) => {
      const body = (await request.json()) as { body?: string };
      posts.push(body);

      return HttpResponse.json({ data: sentMessage(body.body ?? '') }, { status: 201 });
    }),
  );

  return { posts, messageIds };
};

const renderPage = (memberships: Membership[] = [staffMembership]) =>
  renderWithTheme(
    <MemoryRouter initialEntries={['/academico/comunicacao']}>
      <StaffCommunication />
    </MemoryRouter>,
    { memberships },
  );

const teacherMembership: Membership = {
  ...staffMembership,
  id: 15,
  role: 'teacher',
  role_template: {
    id: 103,
    name: 'Professor',
    system_key: 'teacher',
    is_system: true,
  },
  display_title: 'Professor',
  permissions: ['teach'],
};

const coordinationMembership: Membership = {
  ...staffMembership,
  role_template: staffMembership.role_template
    ? { ...staffMembership.role_template, system_key: 'coordination', name: 'Coordenação' }
    : null,
};

const directorMembership: Membership = {
  ...staffMembership,
  role_template: staffMembership.role_template
    ? { ...staffMembership.role_template, system_key: 'director', name: 'Direção' }
    : null,
};

beforeEach(() => {
  setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);
});

describe('StaffCommunication', () => {
  it('reads each inbox row as the guardian line and marks an unread bell', async () => {
    const read: string[] = [];
    stubInbox({
      classes: [schoolClass(310, 'matutino', 'A')],
      roster: [rosterItem({ student_id: 11, student_name: 'Ana Souza' })],
      conversations: [
        {
          id: 3,
          student_id: 9,
          student_name: 'Lara Nogueira',
          audience: 'secretary',
          teacher_id: null,
          teacher_name: null,
          last_message_at: '2026-10-06T14:00:00.000Z',
          last_message_body: 'Pode buscar mais cedo?',
          school_class_id: 310,
          sender_line: 'Diego, pai da Lara — 1º ano',
        },
        {
          id: 4,
          student_id: 10,
          student_name: 'Theo Nogueira',
          audience: 'secretary',
          teacher_id: null,
          teacher_name: null,
          last_message_at: '2026-10-06T13:00:00.000Z',
          last_message_body: 'Ele está bem',
          school_class_id: 310,
          sender_line: 'Marina, mãe do Theo — 2º ano',
        },
      ],
      notifications: [notification(), notification({ id: 2, conversation_id: 4, read: true })],
    });
    server.use(
      http.patch(apiUrl('/api/v1/notifications/:id'), ({ params }) => {
        read.push(String(params.id));
        return HttpResponse.json({
          data: notification({ id: Number(params.id), read: true }),
        });
      }),
    );

    renderPage();

    expect(await screen.findByText('Diego, pai da Lara — 1º ano')).toBeInTheDocument();
    expect(screen.getByText('Marina, mãe do Theo — 2º ano')).toBeInTheDocument();
    expect(screen.getByText('Pode buscar mais cedo?')).toBeInTheDocument();
    expect(screen.getByText('Lara Nogueira')).toBeInTheDocument();
    expect(screen.getAllByText('Não lida')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Ana Souza' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Diego, pai da Lara — 1º ano' }));

    expect(
      await screen.findByRole('heading', { name: 'Falando como Secretaria com Lara Nogueira' }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(read).toEqual(['1']);
    });
    expect(screen.queryByText('Não lida')).not.toBeInTheDocument();
  });

  it('shows students of a class the teacher is assigned to teach', async () => {
    server.use(
      http.get(apiUrl(`${BASE}/conversations`), () => HttpResponse.json({ data: [] })),
      http.get(apiUrl(`${BASE}/conversations/:id/messages`), () => HttpResponse.json({ data: [] })),
      http.get(apiUrl('/api/v1/notifications'), () =>
        HttpResponse.json({
          data: [],
          meta: { page: 1, per_page: 25, total: 0, unread_count: 0 },
        }),
      ),
      http.get(apiUrl(`/api/v1/schools/${SCHOOL_ID}/academics/school_classes`), ({ request }) => {
        const assignment = new URL(request.url).searchParams.get('assignment');
        const classes = assignment === 'teaching' ? [schoolClass(310, 'matutino', 'A')] : [];

        return HttpResponse.json({
          data: classes,
          meta: { page: 1, per_page: 25, total: classes.length },
        });
      }),
      http.get(apiUrl(`${BASE}/roster`), () => HttpResponse.json({ data: [rosterItem()] })),
    );

    renderPage([teacherMembership]);

    expect(await screen.findByRole('button', { name: 'Lara Nogueira' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Turma' })).toBeInTheDocument();
    expect(screen.queryByText('Nenhum aluno')).not.toBeInTheDocument();
  });

  it('lets a teacher with more than one class pick it, shift included in the name', async () => {
    stubInbox({
      conversations: [],
      classes: [schoolClass(310, 'matutino', 'A'), schoolClass(311, 'vespertino', 'B')],
    });

    renderPage([teacherMembership]);

    await user.click(await screen.findByRole('combobox', { name: 'Turma' }));

    expect(
      screen.getByRole('option', { name: /Ensino Fundamental I — 1º ano A · Matutino — 2026/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: /Ensino Fundamental I — 1º ano B · Vespertino — 2026/ }),
    ).toBeInTheDocument();
  });

  it('offers For me and All to coordination, and only the full list to direction', async () => {
    stubInbox({ conversations: [] });
    const { unmount } = renderPage([coordinationMembership]);

    expect(await screen.findByRole('button', { name: 'Para mim' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Todas' })).toBeInTheDocument();

    unmount();
    stubInbox({ conversations: [] });
    renderPage([directorMembership]);

    expect(await screen.findByText('Nenhum aluno')).toBeInTheDocument();
    expect(
      screen.queryByText('Quando uma família escrever, a conversa aparece aqui.'),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Para mim' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Todas' })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Turma' })).toBeInTheDocument();
  });

  it('lets staff open a student with no conversation and posts the first message', async () => {
    stubInbox({
      classes: [schoolClass(310, 'matutino', 'A')],
      roster: [rosterItem(), rosterItem({ student_id: 10, student_name: 'Theo Nogueira' })],
    });
    const { posts, messageIds } = captureSend();

    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Lara Nogueira' }));
    expect(
      screen.getByRole('heading', { name: 'Falando como Secretaria com Lara Nogueira' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Turma' })).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText('Escreva uma mensagem'), 'Bom dia');
    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    await waitFor(() => {
      expect(posts).toEqual([{ student_id: 9, audience: 'secretary', body: 'Bom dia' }]);
    });

    await user.click(screen.getByRole('button', { name: 'Theo Nogueira' }));
    await user.click(screen.getByRole('button', { name: 'Lara Nogueira' }));

    await waitFor(() => {
      expect(messageIds).toContain('77');
    });
  });

  it('posts the teacher id when a teacher writes to a student who has no conversation', async () => {
    stubInbox({
      classes: [schoolClass(310, 'matutino', 'A')],
      roster: [rosterItem({ teacher_id: 12 })],
      conversations: [],
    });
    const { posts } = captureSend();

    renderPage([teacherMembership]);

    await user.click(await screen.findByRole('button', { name: 'Lara Nogueira' }));
    await user.type(screen.getByPlaceholderText('Escreva uma mensagem'), 'Pode vir mais cedo?');
    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    await waitFor(() => {
      expect(posts).toEqual([
        {
          student_id: 9,
          audience: 'teacher',
          teacher_id: 12,
          body: 'Pode vir mais cedo?',
        },
      ]);
    });
  });

  it('asks direction to pick a destination before the first send', async () => {
    stubInbox({
      classes: [schoolClass(310, 'matutino', 'A')],
      roster: [
        rosterItem({
          destinations: [
            destination('coordination'),
            destination('secretary'),
            destination('teacher', 4, 'Marina Alves'),
          ],
        }),
      ],
    });
    const { posts } = captureSend();

    renderPage([directorMembership]);

    await user.click(await screen.findByRole('button', { name: 'Lara Nogueira' }));
    await user.type(screen.getByPlaceholderText('Escreva uma mensagem'), 'Olá');

    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();
    expect(screen.getByText('Escolha um destino para enviar.')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Escolha o destino para falar com Lara Nogueira' }),
    ).toBeInTheDocument();
    expect(posts).toEqual([]);

    await user.click(screen.getByRole('combobox', { name: 'Destino' }));
    await user.click(screen.getByRole('option', { name: 'Coordenação' }));
    expect(
      screen.getByRole('heading', { name: 'Falando como Coordenação com Lara Nogueira' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Escolha um destino para enviar.')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    await waitFor(() => {
      expect(posts).toEqual([{ student_id: 9, audience: 'coordination', body: 'Olá' }]);
    });
  });

  it('shows coordination every conversation on All and only its own channel on For me', async () => {
    const coordinationThread = {
      id: 3,
      student_id: 9,
      student_name: 'Lara Nogueira',
      audience: 'coordination',
      teacher_id: null,
      teacher_name: null,
      last_message_at: '2026-10-06T14:00:00.000Z',
      last_message_body: 'Para a coordenação',
      school_class_id: 310,
      sender_line: 'Diego, pai da Lara — 1º ano',
    };
    const teacherThread = {
      id: 4,
      student_id: 10,
      student_name: 'Theo Nogueira',
      audience: 'teacher',
      teacher_id: 4,
      teacher_name: 'Marina Alves',
      last_message_at: '2026-10-06T13:00:00.000Z',
      last_message_body: 'Para a professora',
      school_class_id: 310,
      sender_line: 'Marina, mãe do Theo — 2º ano',
    };

    server.use(
      http.get(apiUrl(`${BASE}/conversations`), ({ request }) => {
        const audience = new URL(request.url).searchParams.get('audience');
        const data =
          audience === 'coordination' ? [coordinationThread] : [coordinationThread, teacherThread];
        return HttpResponse.json({
          data,
          meta: { page: 1, per_page: 25, total: data.length },
        });
      }),
      http.get(apiUrl(`${BASE}/conversations/:id/messages`), () => HttpResponse.json({ data: [] })),
      http.get(apiUrl('/api/v1/notifications'), () =>
        HttpResponse.json({
          data: [],
          meta: { page: 1, per_page: 25, total: 0, unread_count: 0 },
        }),
      ),
      http.get(apiUrl(`/api/v1/schools/${SCHOOL_ID}/academics/school_classes`), () =>
        HttpResponse.json({
          data: [schoolClass(310, 'matutino', 'A')],
          meta: { page: 1, per_page: 25, total: 1 },
        }),
      ),
      http.get(apiUrl(`${BASE}/roster`), () =>
        HttpResponse.json({ data: [rosterItem({ student_id: 11, student_name: 'Ana Souza' })] }),
      ),
    );

    renderPage([coordinationMembership]);

    expect(await screen.findByText('Diego, pai da Lara — 1º ano')).toBeInTheDocument();
    expect(screen.queryByText('Marina, mãe do Theo — 2º ano')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ana Souza' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Todas' }));

    expect(await screen.findByText('Marina, mãe do Theo — 2º ano')).toBeInTheDocument();
    expect(screen.getByText('Diego, pai da Lara — 1º ano')).toBeInTheDocument();
    expect(screen.getByText(/Marina Alves/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ana Souza' })).toBeInTheDocument();
  });

  it('lists a conversation that is not on the first page for direction', async () => {
    const pages: string[] = [];
    server.use(
      http.get(apiUrl(`${BASE}/conversations`), ({ request }) => {
        const page = new URL(request.url).searchParams.get('page') ?? '1';
        pages.push(page);
        if (page === '1') {
          return HttpResponse.json({
            data: Array.from({ length: 25 }, (_, index) => ({
              id: index + 1,
              student_id: index + 1,
              student_name: `Aluno ${index + 1}`,
              audience: 'secretary',
              teacher_id: null,
              teacher_name: null,
              last_message_at: '2026-10-06T12:00:00.000Z',
              last_message_body: 'página um',
              school_class_id: 310,
              sender_line: `Família ${index + 1}`,
            })),
            meta: { page: 1, per_page: 25, total: 26 },
          });
        }

        return HttpResponse.json({
          data: [
            {
              id: 80,
              student_id: 9,
              student_name: 'Lara Nogueira',
              audience: 'teacher',
              teacher_id: 4,
              teacher_name: 'Marina Alves',
              last_message_at: '2026-10-06T15:00:00.000Z',
              last_message_body: 'página dois',
              school_class_id: 310,
              sender_line: 'Diego, pai da Lara — 1º ano',
            },
          ],
          meta: { page: 2, per_page: 25, total: 26 },
        });
      }),
      http.get(apiUrl(`${BASE}/conversations/:id/messages`), () => HttpResponse.json({ data: [] })),
      http.get(apiUrl('/api/v1/notifications'), () =>
        HttpResponse.json({
          data: [],
          meta: { page: 1, per_page: 25, total: 0, unread_count: 0 },
        }),
      ),
      http.get(apiUrl(`/api/v1/schools/${SCHOOL_ID}/academics/school_classes`), () =>
        HttpResponse.json({
          data: [schoolClass(310, 'matutino', 'A')],
          meta: { page: 1, per_page: 25, total: 1 },
        }),
      ),
      http.get(apiUrl(`${BASE}/roster`), () => HttpResponse.json({ data: [] })),
    );

    renderPage([directorMembership]);

    expect(await screen.findByText('Diego, pai da Lara — 1º ano')).toBeInTheDocument();
    expect(pages).toContain('2');
    expect(screen.getByText('Nenhum aluno')).toBeInTheDocument();
  });

  it('sends one message to every roster student after the teacher confirms a bulk send', async () => {
    stubInbox({
      classes: [schoolClass(310, 'matutino', 'A')],
      roster: [
        rosterItem({ student_id: 9, student_name: 'Lara Nogueira', teacher_id: 12 }),
        rosterItem({ student_id: 10, student_name: 'Theo Nogueira', teacher_id: 12 }),
      ],
      conversations: [],
    });
    const { posts } = captureSend();

    renderPage([teacherMembership]);

    await user.click(await screen.findByRole('button', { name: 'Enviar para toda a turma' }));
    expect(
      screen.getByRole('heading', { name: 'Mensagem para toda a turma' }),
    ).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Escreva uma mensagem'), 'Prova amanhã');
    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    // The fan-out is gated behind a second, explicit confirmation naming the class and count —
    // nothing is posted until the teacher confirms it.
    expect(
      await screen.findByRole('heading', { name: 'Enviar para toda a turma?' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/enviada para 2 alunos/)).toBeInTheDocument();
    expect(posts).toEqual([]);

    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    await waitFor(() => {
      expect(posts).toHaveLength(2);
    });
    const sorted = [...(posts as Array<{ student_id: number }>)].sort(
      (left, right) => left.student_id - right.student_id,
    );
    expect(sorted).toEqual([
      { student_id: 9, audience: 'teacher', teacher_id: 12, body: 'Prova amanhã' },
      { student_id: 10, audience: 'teacher', teacher_id: 12, body: 'Prova amanhã' },
    ]);
  });

  it('keeps the draft when the teacher cancels the bulk send confirmation', async () => {
    stubInbox({
      classes: [schoolClass(310, 'matutino', 'A')],
      roster: [rosterItem({ student_id: 9, student_name: 'Lara Nogueira', teacher_id: 12 })],
      conversations: [],
    });
    const { posts } = captureSend();

    renderPage([teacherMembership]);

    await user.click(await screen.findByRole('button', { name: 'Enviar para toda a turma' }));
    await user.type(screen.getByPlaceholderText('Escreva uma mensagem'), 'Reunião hoje');
    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    await user.click(await screen.findByRole('button', { name: 'Cancelar' }));

    expect(posts).toEqual([]);
    expect(
      await screen.findByRole('heading', { name: 'Mensagem para toda a turma' }),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Escreva uma mensagem')).toHaveValue('Reunião hoje');
  });

  it('surfaces which students a bulk send failed for, without blocking the ones that succeeded', async () => {
    stubInbox({
      classes: [schoolClass(310, 'matutino', 'A')],
      roster: [
        rosterItem({ student_id: 9, student_name: 'Lara Nogueira', teacher_id: 12 }),
        rosterItem({ student_id: 10, student_name: 'Theo Nogueira', teacher_id: 12 }),
      ],
      conversations: [],
    });

    server.use(
      http.get(apiUrl(`${BASE}/conversations/:id/messages`), () => HttpResponse.json({ data: [] })),
      http.post(apiUrl(`${BASE}/messages`), async ({ request }) => {
        const payload = (await request.json()) as { student_id: number; body: string };
        if (payload.student_id === 10) {
          return HttpResponse.json(
            {
              error: {
                code: 'teacher_not_assigned',
                message: 'O professor não está vinculado a esse aluno.',
              },
            },
            { status: 422 },
          );
        }

        return HttpResponse.json({ data: sentMessage(payload.body) }, { status: 201 });
      }),
    );

    renderPage([teacherMembership]);

    await user.click(await screen.findByRole('button', { name: 'Enviar para toda a turma' }));
    await user.type(screen.getByPlaceholderText('Escreva uma mensagem'), 'Aviso');
    await user.click(screen.getByRole('button', { name: 'Enviar' }));
    await user.click(await screen.findByRole('button', { name: 'Enviar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Theo Nogueira');
    // The composer reopens with the draft intact so the teacher can see what happened and retry.
    expect(screen.getByPlaceholderText('Escreva uma mensagem')).toHaveValue('Aviso');
  });
});

describe('StaffCommunication search', () => {
  it('waits for typing to settle before calling search, then shows guardians on a hit', async () => {
    stubInbox({
      classes: [schoolClass(310, 'matutino', 'A')],
      roster: [],
      conversations: [],
    });
    const queries = stubSearch([
      rosterItem({
        student_id: 9,
        student_name: 'Lara Nogueira',
        guardians: [
          { name: 'Carlos Barbosa', relationship: 'father' },
          { name: 'Mariana Barbosa', relationship: 'mother' },
        ],
      }),
    ]);

    renderPage();

    await screen.findByRole('combobox', { name: 'Turma' });

    await user.type(
      screen.getByRole('textbox', { name: 'Buscar aluno ou responsável' }),
      'Mariana',
    );

    await waitFor(() => expect(queries).toContain('Mariana'));
    // One call for the settled term — not one per keystroke.
    expect(queries).toEqual(['Mariana']);

    expect(await screen.findByText('Lara Nogueira')).toBeInTheDocument();
    expect(screen.getByText('Pai: Carlos Barbosa · Mãe: Mariana Barbosa')).toBeInTheDocument();
    // Cross-class search replaces the single-class picker while it is active.
    expect(screen.queryByRole('combobox', { name: 'Turma' })).not.toBeInTheDocument();
  });

  it('opens a search hit the same way a class roster row opens', async () => {
    stubInbox({
      classes: [schoolClass(310, 'matutino', 'A')],
      roster: [],
      conversations: [],
    });
    stubSearch([
      rosterItem({
        student_id: 9,
        student_name: 'Lara Nogueira',
        guardians: [{ name: 'Carlos Barbosa', relationship: 'father' }],
      }),
    ]);
    const { posts } = captureSend();

    renderPage();
    await screen.findByRole('combobox', { name: 'Turma' });

    await user.type(screen.getByRole('textbox', { name: 'Buscar aluno ou responsável' }), 'Lara');
    await user.click(await screen.findByRole('button', { name: 'Lara Nogueira' }));

    expect(
      await screen.findByRole('heading', { name: 'Falando como Secretaria com Lara Nogueira' }),
    ).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Escreva uma mensagem'), 'Oi');
    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    await waitFor(() => {
      expect(posts).toEqual([{ student_id: 9, audience: 'secretary', body: 'Oi' }]);
    });
  });

  it('still shows a search hit that already has a conversation, and opens that existing thread', async () => {
    stubInbox({
      classes: [schoolClass(310, 'matutino', 'A')],
      roster: [],
      conversations: [
        {
          id: 3,
          student_id: 9,
          student_name: 'Lara Nogueira',
          audience: 'secretary',
          teacher_id: null,
          teacher_name: null,
          last_message_at: '2026-10-06T14:00:00.000Z',
          last_message_body: 'Pode buscar mais cedo?',
          school_class_id: 310,
          sender_line: 'Diego, pai da Lara — 1º ano',
        },
      ],
    });
    stubSearch([
      rosterItem({
        student_id: 9,
        student_name: 'Lara Nogueira',
        guardians: [{ name: 'Carlos Barbosa', relationship: 'father' }],
      }),
    ]);
    const messageIds: string[] = [];
    server.use(
      http.get(apiUrl(`${BASE}/conversations/:id/messages`), ({ params }) => {
        messageIds.push(String(params.id));
        return HttpResponse.json({
          data: [
            {
              id: 1,
              sender_membership_id: 11,
              sender_line: 'Diego, pai da Lara',
              body: 'Pode buscar mais cedo?',
              sent_at: '2026-10-06T14:00:00.000Z',
            },
          ],
        });
      }),
    );

    renderPage();
    await screen.findByRole('combobox', { name: 'Turma' });

    await user.type(screen.getByRole('textbox', { name: 'Buscar aluno ou responsável' }), 'Lara');
    // The hit still shows even though a conversation for this student already exists — search
    // replaces the inbox list while active, so filtering it out here would hide the very
    // conversation the search box exists to find.
    await user.click(await screen.findByRole('button', { name: 'Lara Nogueira' }));

    expect(
      await screen.findByRole('heading', { name: 'Falando como Secretaria com Lara Nogueira' }),
    ).toBeInTheDocument();
    // Opens the existing conversation (id 3) with its prior message — not a blank new thread.
    expect(await screen.findByText('Pode buscar mais cedo?')).toBeInTheDocument();
    await waitFor(() => {
      expect(messageIds).toEqual(['3']);
    });
  });

  it('tells the user nothing matched instead of leaving the list blank', async () => {
    stubInbox({
      classes: [schoolClass(310, 'matutino', 'A')],
      roster: [],
      conversations: [],
    });
    stubSearch([]);

    renderPage();
    await screen.findByRole('combobox', { name: 'Turma' });

    await user.type(
      screen.getByRole('textbox', { name: 'Buscar aluno ou responsável' }),
      'Ninguém',
    );

    expect(await screen.findByText('Nenhum resultado')).toBeInTheDocument();
    expect(screen.getByText('Nada encontrado para "Ninguém".')).toBeInTheDocument();
  });

  it('falls back to the Turma-filtered roster once the search box is cleared', async () => {
    stubInbox({
      classes: [schoolClass(310, 'matutino', 'A')],
      roster: [rosterItem({ student_id: 11, student_name: 'Ana Souza' })],
      conversations: [],
    });
    stubSearch([
      rosterItem({ student_id: 9, student_name: 'Lara Nogueira', guardians: [] }),
    ]);

    renderPage();
    const searchField = await screen.findByRole('textbox', {
      name: 'Buscar aluno ou responsável',
    });

    await user.type(searchField, 'Lara');
    expect(await screen.findByRole('button', { name: 'Lara Nogueira' })).toBeInTheDocument();

    await user.clear(searchField);

    expect(await screen.findByRole('combobox', { name: 'Turma' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Ana Souza' })).toBeInTheDocument();
  });
});
