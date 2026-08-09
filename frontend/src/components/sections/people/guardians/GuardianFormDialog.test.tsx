import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, SCHOOL_ID, apiUrl, http, server } from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { setAccessToken } from 'services/tokenStore';
import { Guardian } from 'types/guardian';
import GuardianFormDialog from './GuardianFormDialog';

const GUARDIANS_PATH = `/api/v1/schools/${SCHOOL_ID}/people/guardians`;

const guardian: Guardian = {
  id: 7,
  school_id: SCHOOL_ID,
  user_id: null,
  name: 'Maria Silva',
  cpf: '123.456.789-00',
  email: 'maria@example.com',
  phone: '+55 11 99999-0000',
};

const renderDialog = (props: Partial<Parameters<typeof GuardianFormDialog>[0]> = {}) => {
  const onSaved = vi.fn();
  const onClose = vi.fn();

  renderWithTheme(
    <GuardianFormDialog
      open
      schoolId={SCHOOL_ID}
      onClose={onClose}
      onSaved={onSaved}
      {...props}
    />,
  );

  return { onSaved, onClose };
};

describe('GuardianFormDialog', () => {
  it('posts the typed guardian and hands the created record back', async () => {
    setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');

    let received: unknown;
    server.use(
      http.post(apiUrl(GUARDIANS_PATH), async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ data: { ...guardian, name: 'João Souza' } }, { status: 201 });
      }),
    );

    const { onSaved } = renderDialog();

    await userEvent.type(screen.getByLabelText(/nome completo/i), 'João Souza');
    await userEvent.type(screen.getByLabelText(/^e-mail/i), 'joao@example.com');
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));

    // The API nests the attributes under `guardian` and stores blank optionals as NULL.
    expect(received).toEqual({
      guardian: { name: 'João Souza', email: 'joao@example.com', cpf: null, phone: null },
    });
  });

  it('shows a validation_error detail under the field it belongs to', async () => {
    setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');

    server.use(
      http.post(apiUrl(GUARDIANS_PATH), () =>
        HttpResponse.json(
          {
            error: {
              code: 'validation_error',
              message: 'Dados inválidos.',
              details: { name: ['não pode ficar em branco'] },
            },
          },
          { status: 422 },
        ),
      ),
    );

    const { onSaved } = renderDialog();

    await userEvent.type(screen.getByLabelText(/nome completo/i), 'X');
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }));

    expect(await screen.findByText('não pode ficar em branco')).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('sends an edit as a PATCH on the guardian, pre-filled with its current values', async () => {
    setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');

    let method = '';
    server.use(
      http.patch(apiUrl(`${GUARDIANS_PATH}/${guardian.id}`), ({ request }) => {
        method = request.method;
        return HttpResponse.json({ data: guardian });
      }),
    );

    const { onSaved } = renderDialog({ guardian });

    expect(screen.getByLabelText(/nome completo/i)).toHaveValue('Maria Silva');

    await userEvent.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(method).toBe('PATCH');
  });

  // A blank name is caught by the field's own `required` before submit ever fires. Whitespace
  // satisfies that check but not the API's `validates :name, presence: true`, so the guard in
  // handleSubmit exists for exactly this case — no request is sent.
  it('blocks the submit when the name is only whitespace', async () => {
    const { onSaved } = renderDialog();

    await userEvent.type(screen.getByLabelText(/nome completo/i), '   ');
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }));

    expect(await screen.findByText(/informe o nome do responsável/i)).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });
});
