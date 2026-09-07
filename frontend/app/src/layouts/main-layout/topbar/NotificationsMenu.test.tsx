import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  ACCESS_EXPIRES_AT,
  FRESH_ACCESS_TOKEN,
  HttpResponse,
  SCHOOL_ID,
  apiUrl,
  http,
  server,
} from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { setAccessToken } from 'services/tokenStore';
import NotificationsMenu from './NotificationsMenu';

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

    renderWithTheme(<NotificationsMenu />);

    await waitFor(() => expect(screen.getByText('1')).toBeInTheDocument());
  });

  it('lists notifications when opened, newest first as the API already ordered them', async () => {
    stubList(
      [ notification({ id: 2, title: 'Segundo' }), notification({ id: 1, title: 'Primeiro' }) ],
      2,
    );

    renderWithTheme(<NotificationsMenu />);
    await waitFor(() => expect(screen.getByText('2')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Notificações' }));

    const menu = screen.getByRole('menu');
    const titles = within(menu).getAllByText(/Primeiro|Segundo/);
    expect(titles.map((node) => node.textContent)).toEqual([ 'Segundo', 'Primeiro' ]);
  });

  it('shows the empty state when there is nothing to show', async () => {
    stubList([], 0);

    renderWithTheme(<NotificationsMenu />);
    await user.click(screen.getByRole('button', { name: 'Notificações' }));

    expect(screen.getByText('Nenhuma notificação por aqui.')).toBeInTheDocument();
  });

  it('marks a notification read on click and drops the badge count by one', async () => {
    stubList([ notification() ], 1);

    renderWithTheme(<NotificationsMenu />);
    await waitFor(() => expect(screen.getByText('1')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Notificações' }));
    await user.click(screen.getByText('Contrato assinado'));

    // MUI's Badge keeps rendering the last count while it fades out, tagged invisible rather
    // than removed — so the badge going invisible is the signal, not the digit disappearing.
    await waitFor(() => expect(screen.getByText('1')).toHaveClass('MuiBadge-invisible'));
  });

  it('marks every notification read with the bulk action', async () => {
    stubList([ notification({ id: 1 }), notification({ id: 2 }) ], 2);

    renderWithTheme(<NotificationsMenu />);
    await waitFor(() => expect(screen.getByText('2')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Notificações' }));
    await user.click(screen.getByRole('button', { name: 'Marcar todas como lidas' }));

    await waitFor(() => expect(screen.getByText('2')).toHaveClass('MuiBadge-invisible'));
  });
});
