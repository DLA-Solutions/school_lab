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
  guardianMembership,
  http,
  server,
} from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { setAccessToken } from 'services/tokenStore';
import FamilyCommunication from './FamilyCommunication';

const user = userEvent.setup({ delay: null });

const BASE = `/api/v1/schools/${SCHOOL_ID}/communication`;

const child = (id: number, name: string) => ({ id, school_id: SCHOOL_ID, name });

const destination = (
  audience: string,
  teacherId: number | null = null,
  name: string | null = null,
) => ({
  audience,
  teacher_id: teacherId,
  name,
});

const stubFamily = ({
  students,
  destinations,
  conversations = [] as unknown[],
  messages = [] as unknown[],
}: {
  students: ReturnType<typeof child>[];
  destinations: ReturnType<typeof destination>[];
  conversations?: unknown[];
  messages?: unknown[];
}) =>
  server.use(
    http.get(apiUrl(`/api/v1/schools/${SCHOOL_ID}/me/students`), () =>
      HttpResponse.json({
        data: students,
        meta: { page: 1, per_page: 25, total: students.length },
      }),
    ),
    http.get(apiUrl(`${BASE}/destinations`), () => HttpResponse.json({ data: destinations })),
    http.get(apiUrl(`${BASE}/conversations`), () => HttpResponse.json({ data: conversations })),
    http.get(apiUrl(`${BASE}/conversations/:id/messages`), () =>
      HttpResponse.json({ data: messages }),
    ),
  );

const renderPage = (path = '/comunicacao') =>
  renderWithTheme(
    <MemoryRouter initialEntries={[path]}>
      <FamilyCommunication />
    </MemoryRouter>,
    { memberships: [guardianMembership] },
  );

beforeEach(() => {
  setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);
});

describe('FamilyCommunication', () => {
  it('lists coordination, secretary, and each teacher when the family has one child', async () => {
    stubFamily({
      students: [child(1, 'Lara Nogueira')],
      destinations: [
        destination('coordination'),
        destination('secretary'),
        destination('teacher', 4, 'Marina Alves'),
        destination('teacher', 5, 'Carlos Mendes'),
      ],
    });

    renderPage();

    expect(await screen.findByRole('button', { name: 'Coordenação' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Secretaria' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Marina Alves' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Carlos Mendes' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Filho' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Marina Alves' }));

    expect(screen.getByPlaceholderText('Escreva uma mensagem')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeInTheDocument();
  });

  it('offers a child selector only when there is more than one child', async () => {
    stubFamily({
      students: [child(1, 'Lara Nogueira'), child(2, 'Theo Nogueira')],
      destinations: [destination('coordination'), destination('secretary')],
    });

    renderPage();

    const childField = await screen.findByRole('combobox', { name: 'Filho' });
    await user.click(childField);

    expect(screen.getByRole('option', { name: 'Lara Nogueira' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Theo Nogueira' })).toBeInTheDocument();
  });

  it('opens the thread named by the bell', async () => {
    stubFamily({
      students: [child(1, 'Lara Nogueira')],
      destinations: [
        destination('coordination'),
        destination('secretary'),
        destination('teacher', 4, 'Marina Alves'),
      ],
      conversations: [
        {
          id: 8,
          student_id: 1,
          student_name: 'Lara Nogueira',
          audience: 'teacher',
          teacher_id: 4,
          teacher_name: 'Marina Alves',
          last_message_at: '2026-10-06T15:00:00Z',
          last_message_body: 'Pode buscar mais cedo?',
          school_class_id: 310,
          sender_line: 'Diego, pai da Lara — 1º ano',
        },
      ],
      messages: [
        {
          id: 21,
          sender_membership_id: 99,
          sender_line: 'Marina Alves, professora',
          body: 'Pode buscar mais cedo?',
          sent_at: '2026-10-06T15:00:00Z',
        },
      ],
    });

    renderPage('/comunicacao?conversation_id=8');

    expect(await screen.findByText('Marina Alves, professora')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Falando com Marina Alves sobre Lara Nogueira' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Marina Alves' })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  it('keeps destinations that have no thread and does not talk about a family writing in', async () => {
    stubFamily({
      students: [child(1, 'Lara Nogueira')],
      destinations: [
        destination('coordination'),
        destination('secretary'),
        destination('teacher', 4, 'Marina Alves'),
      ],
      conversations: [
        {
          id: 8,
          student_id: 1,
          student_name: 'Lara Nogueira',
          audience: 'coordination',
          teacher_id: null,
          teacher_name: null,
          last_message_at: '2026-10-06T15:00:00Z',
          last_message_body: 'Já escrevemos',
          school_class_id: 310,
          sender_line: 'Diego, pai da Lara — 1º ano',
        },
      ],
    });

    renderPage();

    expect(await screen.findByRole('button', { name: 'Coordenação' })).toBeInTheDocument();
    expect(screen.getByText('Já escrevemos')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Secretaria' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Marina Alves' })).toBeInTheDocument();
    expect(screen.queryByText(/Quando uma família escrever/)).not.toBeInTheDocument();
  });

  it('shows an unread chip and clears it when the thread opens', async () => {
    const read: string[] = [];
    stubFamily({
      students: [child(1, 'Lara Nogueira')],
      destinations: [destination('coordination'), destination('secretary')],
      conversations: [
        {
          id: 8,
          student_id: 1,
          student_name: 'Lara Nogueira',
          audience: 'coordination',
          teacher_id: null,
          teacher_name: null,
          last_message_at: '2026-10-06T15:00:00Z',
          last_message_body: 'Oi',
          school_class_id: 310,
          sender_line: 'Diego, pai da Lara — 1º ano',
        },
      ],
    });
    server.use(
      http.get(apiUrl('/api/v1/notifications'), () =>
        HttpResponse.json({
          data: [
            {
              id: 5,
              kind: 'message',
              title: 'Nova mensagem',
              body: null,
              created_at: '2026-10-06T12:00:00Z',
              read: false,
              school_id: SCHOOL_ID,
              contract_id: null,
              conversation_id: 8,
            },
          ],
          meta: { page: 1, per_page: 25, total: 1, unread_count: 1 },
        }),
      ),
      http.patch(apiUrl('/api/v1/notifications/:id'), ({ params }) => {
        read.push(String(params.id));
        return HttpResponse.json({
          data: {
            id: Number(params.id),
            kind: 'message',
            title: 'Nova mensagem',
            body: null,
            created_at: '2026-10-06T12:00:00Z',
            read: true,
            school_id: SCHOOL_ID,
            contract_id: null,
            conversation_id: 8,
          },
        });
      }),
    );

    renderPage();

    expect(await screen.findByText('Não lida')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Coordenação' }));

    await waitFor(() => {
      expect(read).toEqual(['5']);
    });
    expect(screen.queryByText('Não lida')).not.toBeInTheDocument();
  });

  it('opens a deep link that is not on the first page of the inbox', async () => {
    const pages: string[] = [];
    stubFamily({
      students: [child(1, 'Lara Nogueira')],
      destinations: [destination('teacher', 4, 'Marina Alves')],
      messages: [
        {
          id: 21,
          sender_membership_id: 99,
          sender_line: 'Marina Alves',
          body: 'Veio da segunda página',
          sent_at: '2026-10-06T15:00:00Z',
        },
      ],
    });
    server.use(
      http.get(apiUrl(`${BASE}/conversations`), ({ request }) => {
        const page = new URL(request.url).searchParams.get('page') ?? '1';
        pages.push(page);
        if (page === '1') {
          return HttpResponse.json({
            data: Array.from({ length: 25 }, (_, index) => ({
              id: index + 1,
              student_id: 1,
              student_name: 'Lara Nogueira',
              audience: 'secretary',
              teacher_id: null,
              teacher_name: null,
              last_message_at: '2026-10-06T14:00:00.000Z',
              last_message_body: 'página um',
              school_class_id: 310,
              sender_line: 'Diego, pai da Lara — 1º ano',
            })),
            meta: { page: 1, per_page: 25, total: 26 },
          });
        }

        return HttpResponse.json({
          data: [
            {
              id: 80,
              student_id: 1,
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
    );

    renderPage('/comunicacao?conversation_id=80');

    expect(await screen.findByText('Veio da segunda página')).toBeInTheDocument();
    expect(pages).toContain('2');
    expect(screen.getByRole('button', { name: 'Marina Alves' })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  it('refetches the open thread when the window regains focus without dropping a send', async () => {
    let messageCalls = 0;
    stubFamily({
      students: [child(1, 'Lara Nogueira')],
      destinations: [destination('coordination')],
    });
    server.use(
      http.get(apiUrl(`${BASE}/conversations/:id/messages`), () => {
        messageCalls += 1;
        return HttpResponse.json({ data: [] });
      }),
      http.post(apiUrl(`${BASE}/messages`), async ({ request }) => {
        const body = (await request.json()) as { body?: string };
        return HttpResponse.json(
          {
            data: {
              conversation_id: 77,
              message: {
                id: 50,
                sender_membership_id: 11,
                sender_line: 'Diego, pai da Lara — 1º ano',
                body: body.body ?? '',
                sent_at: '2026-10-06T12:00:00Z',
              },
            },
          },
          { status: 201 },
        );
      }),
    );

    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Coordenação' }));
    await user.type(screen.getByPlaceholderText('Escreva uma mensagem'), 'Bom dia');
    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(await screen.findAllByText('Bom dia')).not.toHaveLength(0);
    expect(screen.getAllByText('Diego, pai da Lara — 1º ano').length).toBeGreaterThan(0);
    const afterSend = messageCalls;

    window.dispatchEvent(new Event('focus'));

    await waitFor(() => {
      expect(messageCalls).toBeGreaterThan(afterSend);
    });
    expect(screen.getAllByText('Bom dia').length).toBeGreaterThan(0);
  });
});
