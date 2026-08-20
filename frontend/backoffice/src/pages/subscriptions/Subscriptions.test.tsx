import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import {
  FRESH_ACCESS_TOKEN,
  ACCESS_EXPIRES_AT,
  backofficeUser,
  sampleSubscriptions,
} from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { setAccessToken } from 'services/tokenStore';
import paths from 'routes/paths';
import Subscriptions from './Subscriptions';

const backofficeAuth: AuthContextValue = {
  user: backofficeUser,
  status: 'authenticated',
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
};

const user = userEvent.setup({ delay: null });

const renderPage = () => {
  setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);

  return renderWithTheme(
    <MemoryRouter initialEntries={[paths.subscriptions]}>
      <AuthContext.Provider value={backofficeAuth}>
        <Subscriptions />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
};

describe('Subscriptions page', () => {
  it('lists subscriptions with plan, interval and school from the API', async () => {
    renderPage();

    expect(await screen.findByText(sampleSubscriptions[0]!.school!.name)).toBeInTheDocument();
    expect(screen.getAllByText('Starter').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/ativa/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/mensal/i)).toBeInTheDocument();
  });

  it('keeps manual status editing and hides it for Asaas rows', async () => {
    renderPage();

    expect(await screen.findByText('Escola Beta')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /editar/i })).toBeInTheDocument();

    const sendButtons = screen.getAllByRole('button', { name: /enviar cobrança/i });
    expect(sendButtons.length).toBeGreaterThan(0);
  });

  it('opens hosted checkout when sending an Asaas invoice', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderPage();

    await user.click(await screen.findByRole('button', { name: /enviar cobrança/i }));

    expect(await screen.findByRole('dialog', { name: /cobrança gerada/i })).toBeInTheDocument();
    expect(openSpy).toHaveBeenCalledWith(
      'https://www.asaas.com/i/example',
      '_blank',
      'noopener,noreferrer',
    );
    expect(screen.getByDisplayValue('https://www.asaas.com/i/example')).toBeInTheDocument();
    openSpy.mockRestore();
  });

  it('lists overdue platform invoices without tuition copy', async () => {
    renderPage();

    await user.click((await screen.findAllByRole('button', { name: /ver faturas/i }))[0]!);

    const dialog = await screen.findByRole('dialog', { name: /faturas da assinatura/i });
    expect(within(dialog).getByText(/em atraso/i)).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: /abrir fatura/i })).toHaveAttribute(
      'href',
      'https://www.asaas.com/i/example',
    );
    expect(within(dialog).queryByText(/mensalidade/i)).not.toBeInTheDocument();
  });

  it('asks for interval when assigning a plan', async () => {
    renderPage();

    await user.click(await screen.findByRole('button', { name: /nova assinatura/i }));

    const dialog = await screen.findByRole('dialog', { name: /atribuir plano/i });
    expect(within(dialog).getByLabelText(/periodicidade/i)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/provedor/i)).toBeInTheDocument();
  });
});
