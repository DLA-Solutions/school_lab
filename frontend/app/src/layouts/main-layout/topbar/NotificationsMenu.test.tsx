import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
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
import { Membership } from 'types/auth';
import NotificationsMenu from './NotificationsMenu';

const LocationProbe = () => {
  const { pathname, search } = useLocation();

  return <div data-testid="location">{`${pathname}${search}`}</div>;
};

const renderMenu = (memberships?: Membership[]) =>
  renderWithTheme(
    <MemoryRouter initialEntries={['/']}>
      <NotificationsMenu />
      <LocationProbe />
    </MemoryRouter>,
    memberships ? { memberships } : undefined,
  );

const user = userEvent.setup({ delay: null });

const notification = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  kind: 'contract_signed',
  title: 'Contrato assinado',
  body: 'O contrato de Pedro Silva foi assinado por todas as partes.',
  created_at: '2026-08-01T12:00:00Z',
  read: false,
  school_id: SCHOOL_ID,
  contract_id: 7,
  conversation_id: null,
  ...overrides,
});

const stubList = (data: ReturnType<typeof notification>[], unreadCount: number) =>
  server.use(
    http.get(apiUrl('/api/v1/notifications'), () =>
      HttpResponse.json({
        data,
        meta: { page: 1, per_page: 25, total: data.length, unread_count: unreadCount },
      }),
    ),
  );

beforeEach(() => {
  setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);
});

describe('NotificationsMenu', () => {
  it('shows the unread count as a badge', async () => {
    stubList([ notification() ], 1);

    renderMenu();

    await waitFor(() => expect(screen.getByText('1')).toBeInTheDocument());
  });

  it('lists notifications when opened, newest first as the API already ordered them', async () => {
    stubList(
      [ notification({ id: 2, title: 'Segundo' }), notification({ id: 1, title: 'Primeiro' }) ],
      2,
    );

    renderMenu();
    await waitFor(() => expect(screen.getByText('2')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Notificações' }));

    const menu = screen.getByRole('menu');
    const titles = within(menu).getAllByText(/Primeiro|Segundo/);
    expect(titles.map((node) => node.textContent)).toEqual([ 'Segundo', 'Primeiro' ]);
  });

  it('shows the empty state when there is nothing to show', async () => {
    stubList([], 0);

    renderMenu();
    await user.click(screen.getByRole('button', { name: 'Notificações' }));

    expect(screen.getByText('Nenhuma notificação por aqui.')).toBeInTheDocument();
  });

  it('marks a notification read on click and drops the badge count by one', async () => {
    stubList([ notification() ], 1);

    renderMenu();
    await waitFor(() => expect(screen.getByText('1')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Notificações' }));
    await user.click(screen.getByText('Contrato assinado'));

    // MUI's Badge keeps rendering the last count while it fades out, tagged invisible rather
    // than removed — so the badge going invisible is the signal, not the digit disappearing.
    await waitFor(() => expect(screen.getByText('1')).toHaveClass('MuiBadge-invisible'));
    expect(screen.getByTestId('location')).toHaveTextContent('/');
  });

  it('marks a message read and opens the family chat', async () => {
    stubList(
      [ notification({ kind: 'message', title: 'Nova mensagem', conversation_id: 42, contract_id: null }) ],
      1,
    );

    renderMenu([ guardianMembership ]);
    await waitFor(() => expect(screen.getByText('1')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Notificações' }));
    await user.click(screen.getByText('Nova mensagem'));

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/comunicacao?conversation_id=42'),
    );
  });

  it('marks a message read and opens the school inbox', async () => {
    stubList(
      [ notification({ kind: 'message', title: 'Nova mensagem', conversation_id: 42, contract_id: null }) ],
      1,
    );

    renderMenu();
    await waitFor(() => expect(screen.getByText('1')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Notificações' }));
    await user.click(screen.getByText('Nova mensagem'));

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/academico/comunicacao?conversation_id=42',
      ),
    );
  });

  it('marks every notification read with the bulk action', async () => {
    stubList([ notification({ id: 1 }), notification({ id: 2 }) ], 2);

    renderMenu();
    await waitFor(() => expect(screen.getByText('2')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Notificações' }));
    await user.click(screen.getByRole('button', { name: 'Marcar todas como lidas' }));

    await waitFor(() => expect(screen.getByText('2')).toHaveClass('MuiBadge-invisible'));
  });
});
