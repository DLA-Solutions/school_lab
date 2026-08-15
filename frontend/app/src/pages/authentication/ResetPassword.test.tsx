import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { HttpResponse, apiUrl, http, jsonError, server } from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import ResetPassword from './ResetPassword';

const user = userEvent.setup({ delay: null });

const renderPage = (search = '?token=abc123') =>
  renderWithTheme(
    <MemoryRouter initialEntries={[`/redefinir-senha${search}`]}>
      <Routes>
        <Route path="/redefinir-senha" element={<ResetPassword />} />
        <Route path="/esqueci-senha" element={<div>Esqueci</div>} />
        <Route path="/auth/signin" element={<div>Login</div>} />
      </Routes>
    </MemoryRouter>,
  );

const fill = async (value: string) => {
  await user.type(screen.getByLabelText(/^nova senha/i), value);
  await user.type(screen.getByLabelText(/repita a senha/i), value);
};

describe('ResetPassword', () => {
  it('exchanges the token from the link for the new password', async () => {
    let received: Record<string, string> | undefined;
    server.use(
      http.post(apiUrl('/api/v1/auth/password/reset'), async ({ request }) => {
        received = (await request.json()) as Record<string, string>;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    renderPage();
    await fill('SenhaForte123!');
    await user.click(screen.getByRole('button', { name: /salvar senha/i }));

    await waitFor(() => expect(received).toBeDefined());
    expect(received?.token).toBe('abc123');
    expect(received?.password).toBe('SenhaForte123!');
    expect(await screen.findByText(/senha foi definida/i)).toBeInTheDocument();
  });

  // The checklist mirrors the server's rules, so a weak password never costs a round trip.
  it('will not submit a password that misses a rule', async () => {
    let called = false;
    server.use(
      http.post(apiUrl('/api/v1/auth/password/reset'), () => {
        called = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    renderPage();
    await fill('senhafraca');
    await user.click(screen.getByRole('button', { name: /salvar senha/i }));

    expect(await screen.findByText(/não atende a todos os requisitos/i)).toBeInTheDocument();
    expect(called).toBe(false);
  });

  it('shows which rules are still unmet as the password is typed', async () => {
    renderPage();

    await user.type(screen.getByLabelText(/^nova senha/i), 'abc');

    expect(screen.getByText(/uma letra maiúscula/i)).toBeInTheDocument();
    expect(screen.getByText(/um símbolo/i)).toBeInTheDocument();
  });

  it('reports mismatched confirmations before calling the API', async () => {
    renderPage();

    await user.type(screen.getByLabelText(/^nova senha/i), 'SenhaForte123!');
    await user.type(screen.getByLabelText(/repita a senha/i), 'OutraSenha123!');
    await user.click(screen.getByRole('button', { name: /salvar senha/i }));

    expect(await screen.findByText(/não conferem/i)).toBeInTheDocument();
  });

  // An expired, spent or invented token are refused alike — none is recoverable.
  it('reports a token the API rejects', async () => {
    server.use(
      http.post(apiUrl('/api/v1/auth/password/reset'), () =>
        jsonError(422, 'validation_error', 'Dados inválidos', {
          token: ['Este link expirou ou já foi usado. Peça um novo.'],
        }),
      ),
    );

    renderPage();
    await fill('SenhaForte123!');
    await user.click(screen.getByRole('button', { name: /salvar senha/i }));

    expect(await screen.findByText(/dados inválidos|expirou/i)).toBeInTheDocument();
  });

  it('says so when the link carries no token at all', async () => {
    renderPage('');

    expect(await screen.findByText(/link inválido/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /salvar senha/i })).not.toBeInTheDocument();
  });
});
