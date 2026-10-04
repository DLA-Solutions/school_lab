import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { HttpResponse, SCHOOL_ID, apiUrl, guardianMembership, http, server } from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { setAccessToken } from 'services/tokenStore';
import MyMessages from './MyMessages';

const ME = `/api/v1/schools/${SCHOOL_ID}/me`;

const user = userEvent.setup({ delay: null });

const threads = [
  {
    student_id: 9,
    student_name: 'Ana Lima',
    school_class_id: 8,
    conversation_id: 40,
    last_message_at: '2026-10-04T18:00:00Z',
  },
];

const page = <T,>(rows: T[]) => ({
  data: rows,
  meta: { page: 1, per_page: 100, total: rows.length },
});

const routineCard = {
  id: 6,
  student_id: 9,
  school_class_id: 8,
  date: '2026-10-04',
  status: 'sent',
  narrative: 'Pintou com as mãos.',
  meal_lunch: 'regular',
  attachment_ids: [],
  sent_at: '2026-10-04T18:00:00Z',
};

interface Sent {
  body: Record<string, unknown>;
}

const stub = () => {
  const sent: Sent[] = [];

  server.use(
    http.get(apiUrl(`${ME}/conversations`), () => HttpResponse.json(page(threads))),
    http.get(apiUrl(`${ME}/conversations/:studentId/messages`), () =>
      HttpResponse.json(
        page([
          {
            id: 1,
            conversation_id: 40,
            sender_membership_id: 15,
            body: null,
            kind: 'routine',
            daily_routine_id: 6,
            attachment_ids: [],
            sent_at: '2026-10-04T18:00:00Z',
          },
          {
            id: 2,
            conversation_id: 40,
            sender_membership_id: 15,
            body: 'Amanhã teremos passeio.',
            kind: 'text',
            daily_routine_id: null,
            attachment_ids: [],
            sent_at: '2026-10-04T18:05:00Z',
          },
        ]),
      ),
    ),
    http.get(apiUrl(`${ME}/daily_routines/:id`), () => HttpResponse.json({ data: routineCard })),
    http.post(apiUrl(`${ME}/conversations/:studentId/messages`), async ({ request }) => {
      sent.push({ body: (await request.json()) as Record<string, unknown> });
      return HttpResponse.json(
        {
          data: {
            id: 3,
            conversation_id: 40,
            sender_membership_id: guardianMembership.id,
            body: 'Obrigada',
            kind: 'text',
            daily_routine_id: null,
            attachment_ids: [],
            sent_at: '2026-10-04T19:00:00Z',
          },
        },
        { status: 201 },
      );
    }),
  );

  return sent;
};

const renderPage = () => {
  setAccessToken('fresh-access-token', '2026-10-04T23:20:00Z');

  return renderWithTheme(
    <MemoryRouter initialEntries={['/mensagens']}>
      <MyMessages />
    </MemoryRouter>,
    { memberships: [guardianMembership] },
  );
};

describe('My messages, as the family reads and replies', () => {
  it('reads a routine card as a story and keeps blank marks off the page', async () => {
    stub();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /ana lima/i }));

    expect(await screen.findByText('Pintou com as mãos.')).toBeInTheDocument();
    expect(screen.getByText('Amanhã teremos passeio.')).toBeInTheDocument();
    expect(screen.getByText(/Almoço: Regular/)).toBeInTheDocument();
    expect(screen.queryByText(/^Sono$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Manhã:/)).not.toBeInTheDocument();
  });

  it('replies on the same thread', async () => {
    const sent = stub();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /ana lima/i }));
    await user.type(await screen.findByLabelText('Mensagem'), 'Obrigada, recebi.');
    await user.click(screen.getByRole('button', { name: /^enviar$/i }));

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0].body).toMatchObject({
      body: 'Obrigada, recebi.',
      attachment_ids: [],
    });
  });
});
