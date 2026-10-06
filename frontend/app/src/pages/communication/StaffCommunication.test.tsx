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

const conversation = (overrides: Record<string, unknown> = {}) => ({
  id: 3,
  student_id: 9,
  audience: 'secretary',
  teacher_id: null,
  last_message_at: '2026-10-06T12:00:00Z',
  school_class_id: 310,
  sender_line: 'Diego, pai da Lara — 1º ano',
  ...overrides,
});

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

const stubInbox = ({
  conversations,
  notifications = [] as ReturnType<typeof notification>[],
  classes,
}: {
  conversations: ReturnType<typeof conversation>[];
  notifications?: ReturnType<typeof notification>[];
  classes?: ReturnType<typeof schoolClass>[];
}) =>
  server.use(
    http.get(apiUrl(`${BASE}/conversations`), () => HttpResponse.json({ data: conversations })),
    http.get(apiUrl(`${BASE}/conversations/:id/messages`), () => HttpResponse.json({ data: [] })),
    http.get(apiUrl('/api/v1/notifications'), () =>
      HttpResponse.json({
        data: notifications,
        meta: { page: 1, per_page: 25, total: notifications.length, unread_count: notifications.length },
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
  );

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
    stubInbox({
      conversations: [
        conversation(),
        conversation({
          id: 4,
          sender_line: 'Marina, mãe do Theo — 2º ano',
          student_id: 10,
        }),
      ],
      notifications: [notification(), notification({ id: 2, conversation_id: 4, read: true })],
    });

    renderPage();

    expect(await screen.findByText('Diego, pai da Lara — 1º ano')).toBeInTheDocument();
    expect(screen.getByText('Marina, mãe do Theo — 2º ano')).toBeInTheDocument();
    expect(screen.getAllByText('Não lida')).toHaveLength(1);
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

    expect(await screen.findByText('Nenhuma conversa')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Para mim' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Todas' })).not.toBeInTheDocument();
  });
});
