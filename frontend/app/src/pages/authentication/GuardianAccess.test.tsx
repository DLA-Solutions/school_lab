import { ComponentType } from 'react';
import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { HttpResponse, apiUrl, http, server } from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import GuardianAccess from './GuardianAccess';
import ForgotPassword from './ForgotPassword';

const user = userEvent.setup({ delay: null });

const renderPage = (Page: ComponentType) =>
  renderWithTheme(
    <MemoryRouter>
      <Page />
    </MemoryRouter>,
  );

describe('GuardianAccess', () => {
  it('sends the CPF as bare digits', async () => {
    let received: { cpf?: string } | undefined;
    server.use(
      http.post(apiUrl('/api/v1/auth/access'), async ({ request }) => {
        received = (await request.json()) as { cpf?: string };
        return new HttpResponse(null, { status: 204 });
      }),
    );

    renderPage(GuardianAccess);

    await user.type(screen.getByLabelText(/cpf/i), '12345678909');
    await user.click(screen.getByRole('button', { name: /enviar link/i }));

    await waitFor(() => expect(received).toBeDefined());
    expect(received?.cpf).toBe('12345678909');
  });

  // Saying "this CPF is not registered" would let anyone walk a list of CPFs and learn which
  // children attend the school, so the screen must not reveal which case it hit.
  it('confirms the same way whatever the CPF turns out to be', async () => {
    server.use(http.post(apiUrl('/api/v1/auth/access'), () => new HttpResponse(null, { status: 204 })));

    renderPage(GuardianAccess);
    await user.type(screen.getByLabelText(/cpf/i), '52998224725');
    await user.click(screen.getByRole('button', { name: /enviar link/i }));

    const confirmation = await screen.findByText(/se este cpf estiver cadastrado/i);
    expect(confirmation).toBeInTheDocument();
    expect(screen.queryByText(/não encontrado|não cadastrado|inválido/i)).not.toBeInTheDocument();
  });

  // The only local check is that the document is well formed; whose it is stays the server's business.
  it('refuses a CPF whose check digits do not match, without calling the API', async () => {
    let called = false;
    server.use(
      http.post(apiUrl('/api/v1/auth/access'), () => {
        called = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    renderPage(GuardianAccess);
    await user.type(screen.getByLabelText(/cpf/i), '11111111111');
    await user.click(screen.getByRole('button', { name: /enviar link/i }));

    expect(await screen.findByText(/informe um cpf válido/i)).toBeInTheDocument();
    expect(called).toBe(false);
  });
});

describe('ForgotPassword', () => {
  it('confirms the same way for an address nobody is registered under', async () => {
    server.use(
      http.post(apiUrl('/api/v1/auth/password'), () => new HttpResponse(null, { status: 204 })),
    );

    renderPage(ForgotPassword);
    await user.type(screen.getByLabelText(/e-mail/i), 'ninguem@example.com');
    await user.click(screen.getByRole('button', { name: /enviar link/i }));

    expect(await screen.findByText(/se este e-mail estiver cadastrado/i)).toBeInTheDocument();
  });
});
