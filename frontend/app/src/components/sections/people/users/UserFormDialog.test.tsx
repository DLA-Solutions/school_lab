import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ACCESS_EXPIRES_AT, FRESH_ACCESS_TOKEN, SCHOOL_ID, server } from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { setAccessToken } from 'services/tokenStore';
import UserFormDialog from './UserFormDialog';

const user = userEvent.setup({ delay: null });

beforeEach(() => {
  setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);
});

/** O que foi realmente pedido à API — é o contrato que esta tela precisa acertar. */
const captureCreate = () => {
  const bodies: Record<string, unknown>[] = [];

  server.events.on('request:start', async ({ request }) => {
    if (request.method !== 'POST' || !request.url.includes('/people/memberships')) {
      return;
    }

    bodies.push(((await request.clone().json()) as { membership: Record<string, unknown> })
      .membership);
  });

  return bodies;
};

const renderDialog = (onCreated = vi.fn()) => {
  renderWithTheme(
    <UserFormDialog open schoolId={SCHOOL_ID} onClose={vi.fn()} onCreated={onCreated} />,
  );

  return onCreated;
};

/** Os perfis chegam da API, então o select só abre depois que eles respondem. */
const pick = async (name: string, option: string) => {
  const select = await screen.findByRole('combobox', { name });
  await waitFor(() => expect(select).not.toHaveAttribute('aria-disabled', 'true'));

  await user.click(select);
  await user.click(await screen.findByRole('option', { name: option }));
};

describe('UserFormDialog', () => {
  it('creates an invited account for the school office', async () => {
    const sent = captureCreate();
    const onCreated = renderDialog();

    await user.type(screen.getByLabelText(/E-mail/), 'secretaria@example.com');
    await pick('Perfil de permissões', 'Secretária');
    await user.click(screen.getByRole('button', { name: 'Enviar convite' }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(sent[0]).toMatchObject({ email: 'secretaria@example.com', role: 'staff' });
    expect(sent[0].role_template_id).toEqual(expect.any(Number));
    // A conta nasce convidada: quem cadastra não escolhe a senha de ninguém.
    expect(onCreated.mock.calls[0][0]).toMatchObject({ status: 'invited' });
  });

  // Um responsável vê os próprios filhos; não há perfil a escolher.
  it('asks no permission profile of a family', async () => {
    const sent = captureCreate();
    const onCreated = renderDialog();

    await pick('Tipo de acesso', 'Família');

    expect(screen.queryByRole('combobox', { name: 'Perfil de permissões' })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/E-mail/), 'familia@example.com');
    await user.click(screen.getByRole('button', { name: 'Enviar convite' }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(sent[0]).toMatchObject({ role: 'guardian', role_template_id: null });
  });

  // O perfil de professor pertence a quem leciona, e os da equipe não: oferecer Secretaria a um
  // professor só produziria um erro do servidor depois do formulário preenchido.
  it('does not offer the office profiles to a teacher', async () => {
    renderDialog();

    await pick('Tipo de acesso', 'Professor');

    const profiles = await screen.findByRole('combobox', { name: 'Perfil de permissões' });
    await user.click(profiles);

    expect(screen.queryByRole('option', { name: 'Secretária' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Direção' })).not.toBeInTheDocument();
  });

  it('refuses to send an invitation with no address to send it to', async () => {
    const onCreated = renderDialog();

    await pick('Perfil de permissões', 'Secretária');

    await user.click(screen.getByRole('button', { name: 'Enviar convite' }));

    expect(await screen.findByText('Informe o e-mail de quem vai acessar.')).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('refuses staff access with no permission profile', async () => {
    const onCreated = renderDialog();

    await user.type(screen.getByLabelText(/E-mail/), 'alguem@example.com');
    await user.click(screen.getByRole('button', { name: 'Enviar convite' }));

    expect(await screen.findByText('Selecione o perfil de permissões.')).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
  });
});
