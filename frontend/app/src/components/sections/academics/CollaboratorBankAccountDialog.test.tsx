import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
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
import { Teacher, TeacherBankAccount } from 'types/academics';
import CollaboratorBankAccountDialog from './CollaboratorBankAccountDialog';

const user = userEvent.setup({ delay: null });

const teacher: Teacher = {
  id: 9,
  school_id: SCHOOL_ID,
  name: 'Carla Nogueira',
  cpf: '15852119075',
  email: 'carla@example.com',
  phone: null,
  job_position_id: 3,
  job_title: 'Coordenadora',
  hired_on: '2024-02-01',
  classes: [],
};

const PATH = `/api/v1/schools/${SCHOOL_ID}/academics/teachers/${teacher.id}/bank_account`;

/** What the API answers for a collaborator nobody has set up yet. */
const emptyAccount: TeacherBankAccount = {
  id: null,
  teacher_id: teacher.id,
  pix_key: null,
  bank_name: null,
  agency: null,
  account_number: null,
  updated_by_name: null,
  updated_at: null,
  filled: false,
};

const stubAccount = (account: TeacherBankAccount = emptyAccount) =>
  server.use(http.get(apiUrl(PATH), () => HttpResponse.json({ data: account })));

const stubSave = () => {
  const bodies: Record<string, unknown>[] = [];

  server.use(
    http.put(apiUrl(PATH), async ({ request }) => {
      const body = (await request.json()) as { bank_account: Record<string, unknown> };
      bodies.push(body.bank_account);

      return HttpResponse.json({
        data: { ...emptyAccount, ...body.bank_account, filled: true },
      });
    }),
  );

  return bodies;
};

beforeEach(() => {
  setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);
});

const renderDialog = (onClose = vi.fn()) => {
  renderWithTheme(
    <CollaboratorBankAccountDialog
      open
      schoolId={SCHOOL_ID}
      teacher={teacher}
      onClose={onClose}
    />,
  );

  return onClose;
};

describe('CollaboratorBankAccountDialog', () => {
  it('opens empty for a collaborator nobody has set up yet', async () => {
    stubAccount();

    renderDialog();

    expect(await screen.findByLabelText('Chave pix')).toHaveValue('');
    expect(screen.getByLabelText('Banco')).toHaveValue('');
  });

  it('shows the details already on file', async () => {
    stubAccount({
      ...emptyAccount,
      id: 4,
      bank_name: 'Banco do Brasil',
      agency: '1234-5',
      account_number: '98765-4',
      filled: true,
    });

    renderDialog();

    expect(await screen.findByLabelText('Banco')).toHaveValue('Banco do Brasil');
    expect(screen.getByLabelText('Agência')).toHaveValue('1234-5');
    expect(screen.getByLabelText('Número da conta')).toHaveValue('98765-4');
  });

  // A pix key is the short road: no bank, no branch, no account.
  it('saves a pix key on its own', async () => {
    stubAccount();
    const bodies = stubSave();
    const onClose = renderDialog();

    await user.type(await screen.findByLabelText('Chave pix'), 'carla@example.com');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toMatchObject({ pix_key: 'carla@example.com', bank_name: null });
    expect(onClose).toHaveBeenCalled();
  });

  it('saves the bank in the words the payer will recognise, with branch and account', async () => {
    stubAccount();
    const bodies = stubSave();

    renderDialog();

    await user.type(await screen.findByLabelText('Banco'), 'Banco do Brasil');
    await user.type(screen.getByLabelText('Agência'), '1234-5');
    await user.type(screen.getByLabelText('Número da conta'), '98765-4');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toMatchObject({
      bank_name: 'Banco do Brasil',
      agency: '1234-5',
      account_number: '98765-4',
    });
  });

  // Half an account is not a route to anywhere — the school is told before a round trip.
  it('refuses a branch with no account number', async () => {
    stubAccount();
    const bodies = stubSave();

    renderDialog();

    await user.type(await screen.findByLabelText('Banco'), 'Banco do Brasil');
    await user.type(screen.getByLabelText('Agência'), '1234-5');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Informe o número da conta.')).toBeInTheDocument();
    expect(bodies).toHaveLength(0);
  });

  it('refuses an account at no named bank', async () => {
    stubAccount();
    const bodies = stubSave();

    renderDialog();

    await user.type(await screen.findByLabelText('Agência'), '1234-5');
    await user.type(screen.getByLabelText('Número da conta'), '98765-4');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Informe o banco da conta.')).toBeInTheDocument();
    expect(bodies).toHaveLength(0);
  });

  it('refuses a form with nothing in it', async () => {
    stubAccount();
    const bodies = stubSave();

    renderDialog();

    await screen.findByLabelText('Chave pix');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Informe a chave pix ou os dados da conta.')).toBeInTheDocument();
    expect(bodies).toHaveLength(0);
  });

  // Money leaves on the strength of this record, so it says who last wrote it.
  it('says who last wrote the details', async () => {
    stubAccount({
      ...emptyAccount,
      id: 4,
      pix_key: 'carla@example.com',
      updated_by_name: 'secretaria@example.com',
      updated_at: '2026-08-10T12:00:00Z',
      filled: true,
    });

    renderDialog();

    expect(await screen.findByText(/secretaria@example.com/)).toBeInTheDocument();
  });

  it('says so when the details cannot be loaded', async () => {
    server.use(http.get(apiUrl(PATH), () => HttpResponse.error()));

    renderDialog();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar os dados bancários.',
    );
  });
});
