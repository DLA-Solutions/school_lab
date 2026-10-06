import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
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

const destination = (audience: string, teacherId: number | null = null, name: string | null = null) => ({
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
    http.get(apiUrl(`${BASE}/conversations/:id/messages`), () => HttpResponse.json({ data: messages })),
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
          audience: 'teacher',
          teacher_id: 4,
          last_message_at: '2026-10-06T15:00:00Z',
          school_class_id: 310,
          sender_line: 'Diego, pai da Lara — 1º ano',
        },
      ],
      messages: [
        {
          id: 21,
          sender_membership_id: 99,
          body: 'Pode buscar mais cedo?',
          sent_at: '2026-10-06T15:00:00Z',
        },
      ],
    });

    renderPage('/comunicacao?conversation_id=8');

    expect(await screen.findByText('Pode buscar mais cedo?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Marina Alves' })).toHaveAttribute('aria-current', 'true');
  });
});
