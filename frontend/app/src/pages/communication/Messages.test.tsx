import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { HttpResponse, SCHOOL_ID, apiUrl, http, server, staffMembership } from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { setAccessToken } from 'services/tokenStore';
import { Membership } from 'types/auth';
import { SchoolClass } from 'types/academics';
import Messages from './Messages';

const COMM = `/api/v1/schools/${SCHOOL_ID}/communication`;
const CLASSES = `/api/v1/schools/${SCHOOL_ID}/academics/school_classes`;

const user = userEvent.setup({ delay: null });

const teacherMembership: Membership = {
  ...staffMembership,
  id: 15,
  role: 'teacher',
  email: 'carla@example.com',
  permissions: ['teach'],
  permission_sources: { teach: 'template' },
  display_title: 'Professora',
};

const infantil: SchoolClass = {
  id: 8,
  school_id: SCHOOL_ID,
  name: 'A',
  grade_level: 'infantil_2',
  shift: 'matutino',
  year: 2026,
  student_count: 2,
  subjects: [],
};

const threads = [
  {
    student_id: 9,
    student_name: 'Ana Lima',
    school_class_id: 8,
    conversation_id: null,
    last_message_at: null,
  },
  {
    student_id: 10,
    student_name: 'Pedro Lima',
    school_class_id: 8,
    conversation_id: 40,
    last_message_at: '2026-10-04T12:00:00Z',
  },
];

const page = <T,>(rows: T[]) => ({
  data: rows,
  meta: { page: 1, per_page: 100, total: rows.length },
});

interface Sent {
  method: string;
  path: string;
  body: Record<string, unknown> | null;
}

const stub = () => {
  const sent: Sent[] = [];

  server.use(
    http.get(apiUrl(`${COMM}/conversations`), () => HttpResponse.json(page(threads))),
    http.get(apiUrl(CLASSES), () => HttpResponse.json(page([infantil]))),
    http.get(apiUrl(`${COMM}/conversations/:studentId/messages`), () => HttpResponse.json(page([]))),
    http.post(apiUrl(`${COMM}/conversations/:studentId/messages`), async ({ request, params }) => {
      sent.push({
        method: 'POST',
        path: String(params.studentId),
        body: (await request.json()) as Record<string, unknown>,
      });
      return HttpResponse.json(
        {
          data: {
            id: 900,
            conversation_id: 40,
            sender_membership_id: teacherMembership.id,
            body: 'Bom dia',
            kind: 'text',
            daily_routine_id: null,
            attachment_ids: [],
            sent_at: '2026-10-04T15:00:00Z',
          },
        },
        { status: 201 },
      );
    }),
    http.post(apiUrl(`${COMM}/attachments`), () => {
      sent.push({ method: 'UPLOAD', path: 'attachments', body: null });
      return HttpResponse.json(
        { data: { id: 12, content_type: 'image/jpeg', byte_size: 4 } },
        { status: 201 },
      );
    }),
    http.post(apiUrl(`${COMM}/class_notices`), async ({ request }) => {
      sent.push({
        method: 'NOTICE',
        path: 'class_notices',
        body: (await request.json()) as Record<string, unknown>,
      });
      return HttpResponse.json({ data: [] }, { status: 201 });
    }),
  );

  return sent;
};

const renderPage = () => {
  setAccessToken('fresh-access-token', '2026-10-04T23:20:00Z');

  return renderWithTheme(
    <MemoryRouter initialEntries={['/academico/mensagens']}>
      <Messages />
    </MemoryRouter>,
    { memberships: [teacherMembership] },
  );
};

describe('Messages, as the teacher writes them', () => {
  it('lists the children in the teacher’s classes', async () => {
    stub();
    renderPage();

    expect(await screen.findByRole('button', { name: /ana lima/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pedro lima/i })).toBeInTheDocument();
    expect(screen.getByText('Sem mensagens')).toBeInTheDocument();
  });

  it('sends a text message on the child’s thread', async () => {
    const sent = stub();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /ana lima/i }));
    const fields = screen.getAllByLabelText('Mensagem');
    await user.type(fields[0], 'Bom dia, família.');
    await user.click(screen.getByRole('button', { name: /^enviar$/i }));

    await waitFor(() => expect(sent.some((call) => call.method === 'POST')).toBe(true));
    expect(sent.find((call) => call.method === 'POST')).toMatchObject({
      path: '9',
      body: {
        body: 'Bom dia, família.',
        attachment_ids: [],
      },
    });
  });

  it('uploads a photo and sends it with the message', async () => {
    const sent = stub();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /ana lima/i }));
    const photo = screen.getAllByText('Foto')[0].closest('label')?.querySelector('input');
    const file = new File(['img'], 'rodinha.jpg', { type: 'image/jpeg' });
    await user.upload(photo as HTMLInputElement, file);
    await user.type(screen.getAllByLabelText('Mensagem')[0], 'Segue a foto.');
    await user.click(screen.getByRole('button', { name: /^enviar$/i }));

    await waitFor(() => expect(sent.some((call) => call.method === 'POST')).toBe(true));
    expect(sent.some((call) => call.method === 'UPLOAD')).toBe(true);
    expect(sent.find((call) => call.method === 'POST')?.body).toMatchObject({
      attachment_ids: [12],
      body: 'Segue a foto.',
    });
  });

  it('copies one notice into the class the children are in', async () => {
    const sent = stub();
    server.use(
      http.get(apiUrl(CLASSES), () =>
        HttpResponse.json(
          page([
            infantil,
            { ...infantil, id: 99, name: 'Z', grade_level: 'fundamental_i_5' },
          ]),
        ),
      ),
    );
    renderPage();

    await screen.findByRole('button', { name: /ana lima/i });
    expect(screen.queryByText(/Z ·/)).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Mensagem'), 'Amanhã teremos passeio.');
    await user.click(screen.getByRole('button', { name: /enviar para a turma/i }));

    await waitFor(() => expect(sent.some((call) => call.method === 'NOTICE')).toBe(true));
    expect(sent.find((call) => call.method === 'NOTICE')?.body).toMatchObject({
      school_class_id: 8,
      body: 'Amanhã teremos passeio.',
      attachment_ids: [],
    });
  });

  it('refuses an empty message before calling the API', async () => {
    const sent = stub();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /ana lima/i }));
    await user.click(screen.getByRole('button', { name: /^enviar$/i }));

    expect(await screen.findByText('Escreva uma mensagem ou anexe um arquivo.')).toBeInTheDocument();
    expect(sent).toHaveLength(0);
  });

  it('does not offer the composer to staff who are not teachers', async () => {
    stub();
    setAccessToken('fresh-access-token', '2026-10-04T23:20:00Z');

    renderWithTheme(
      <MemoryRouter>
        <Messages />
      </MemoryRouter>,
      { memberships: [{ ...staffMembership, permissions: ['manage_academic'] }] },
    );

    expect(await screen.findByText(/coordenação não abre esse fio/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^enviar$/i })).not.toBeInTheDocument();
  });
});
