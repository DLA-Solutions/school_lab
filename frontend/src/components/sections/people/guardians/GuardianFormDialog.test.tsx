import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, SCHOOL_ID, apiUrl, http, server } from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { setAccessToken } from 'services/tokenStore';
import { Guardian } from 'types/guardian';
import GuardianFormDialog from './GuardianFormDialog';

const GUARDIANS_PATH = `/api/v1/schools/${SCHOOL_ID}/people/guardians`;

/** A real CPF — the check digits are validated on both sides. */
const VALID_CPF = '123.456.789-09';

const guardian: Guardian = {
  id: 7,
  school_id: SCHOOL_ID,
  user_id: null,
  name: 'Maria Silva',
  cpf: '12345678909',
  email: 'maria@example.com',
  phone: '+55 11 99999-0000',
  zip_code: '01310100',
  street: 'Avenida Paulista',
  number: '1000',
  complement: null,
  neighborhood: 'Bela Vista',
  city: 'São Paulo',
  state: 'SP',
};

const renderDialog = (props: Partial<Parameters<typeof GuardianFormDialog>[0]> = {}) => {
  const onSaved = vi.fn();
  const onClose = vi.fn();

  renderWithTheme(
    <GuardianFormDialog open schoolId={SCHOOL_ID} onClose={onClose} onSaved={onSaved} {...props} />,
  );

  return { onSaved, onClose };
};

const user = userEvent.setup({ delay: null });

/**
 * Sets a controlled field in one event instead of one per keystroke.
 *
 * This form has eleven fields, and typing them character by character is by far the slowest thing
 * in the file — enough to blow the default timeout when the suite runs in parallel. The change
 * handler (mask included) is the same either way; where the per-keystroke path is what's under
 * test, the spec still types for real.
 */
const setField = (label: RegExp, value: string) => {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
};

// The address is required in full, so a "filled form" now includes it.
const fillRequiredFields = () => {
  setField(/nome completo/i, 'João Souza');
  setField(/^cpf/i, VALID_CPF);
  setField(/^e-mail/i, 'joao@example.com');
  setField(/^telefone/i, '+55 11 98888-0000');
  setField(/^cep/i, '01310100');
  setField(/logradouro/i, 'Avenida Paulista');
  setField(/número/i, '1000');
  setField(/bairro/i, 'Bela Vista');
  setField(/cidade/i, 'São Paulo');
};

const selectState = async (uf: string) => {
  await user.click(screen.getByRole('combobox', { name: /uf/i }));
  await user.click(screen.getByRole('option', { name: uf }));
};

const authenticate = () => setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');

describe('GuardianFormDialog', () => {
  it('sends the CPF and CEP as bare digits and the UF upcased', async () => {
    authenticate();

    let received: unknown;
    server.use(
      http.post(apiUrl(GUARDIANS_PATH), async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ data: guardian }, { status: 201 });
      }),
    );

    const { onSaved } = renderDialog();

    fillRequiredFields();
    await selectState('SP');
    await user.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));

    expect(received).toEqual({
      guardian: {
        name: 'João Souza',
        cpf: '12345678909',
        email: 'joao@example.com',
        phone: '+55 11 98888-0000',
        zip_code: '01310100',
        street: 'Avenida Paulista',
        number: '1000',
        complement: null,
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
      },
    });
  });

  it('masks the CPF as it is typed', async () => {
    renderDialog();

    await user.type(screen.getByLabelText(/^cpf/i), '12345678909');

    expect(screen.getByLabelText(/^cpf/i)).toHaveValue(VALID_CPF);
  });

  describe('client-side rules that spare a round trip', () => {
    it('rejects a CPF whose check digits do not match', async () => {
      const { onSaved } = renderDialog();

      setField(/nome completo/i, 'João Souza');
      setField(/^cpf/i, '123.456.789-00');
      setField(/^e-mail/i, 'joao@example.com');
      setField(/^telefone/i, '11988880000');
      await user.click(screen.getByRole('button', { name: /salvar/i }));

      expect(await screen.findByText(/cpf inválido/i)).toBeInTheDocument();
      expect(onSaved).not.toHaveBeenCalled();
    });

    it.each([
      ['nome completo', /informe o nome/i],
      ['^cpf', /informe o cpf/i],
      ['^e-mail', /informe o e-mail/i],
      ['^telefone', /informe o telefone/i],
    ])('requires %s', async (_label, message) => {
      const { onSaved } = renderDialog();

      await user.click(screen.getByRole('button', { name: /salvar/i }));

      expect(await screen.findByText(message)).toBeInTheDocument();
      expect(onSaved).not.toHaveBeenCalled();
    });

    // The address is required in full — a contract is mailed to it.
    it('rejects a guardian with no address', async () => {
      const { onSaved } = renderDialog();

      setField(/nome completo/i, 'João Souza');
      setField(/^cpf/i, VALID_CPF);
      setField(/^e-mail/i, 'joao@example.com');
      setField(/^telefone/i, '+55 11 98888-0000');
      await user.click(screen.getByRole('button', { name: /salvar/i }));

      // One complaint per required address field; `complement` stays optional.
      expect(await screen.findAllByText(/campo obrigatório/i)).toHaveLength(6);
      expect(onSaved).not.toHaveBeenCalled();
    });
  });

  it('shows a duplicate-CPF rejection from the API under the CPF field', async () => {
    authenticate();

    server.use(
      http.post(apiUrl(GUARDIANS_PATH), () =>
        HttpResponse.json(
          {
            error: {
              code: 'validation_error',
              message: 'Dados inválidos.',
              details: { cpf: ['já cadastrado para outro responsável nesta escola'] },
            },
          },
          { status: 422 },
        ),
      ),
    );

    const { onSaved } = renderDialog();

    fillRequiredFields();
    await selectState('SP');
    await user.click(screen.getByRole('button', { name: /salvar/i }));

    expect(
      await screen.findByText('já cadastrado para outro responsável nesta escola'),
    ).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('sends an edit as a PATCH, pre-filled with the stored values formatted', async () => {
    authenticate();

    let method = '';
    server.use(
      http.patch(apiUrl(`${GUARDIANS_PATH}/${guardian.id}`), ({ request }) => {
        method = request.method;
        return HttpResponse.json({ data: guardian });
      }),
    );

    const { onSaved } = renderDialog({ guardian });

    expect(screen.getByLabelText(/nome completo/i)).toHaveValue('Maria Silva');
    expect(screen.getByLabelText(/^cpf/i)).toHaveValue(VALID_CPF);
    expect(screen.getByLabelText(/^cep/i)).toHaveValue('01310-100');

    await user.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(method).toBe('PATCH');
  });
});
