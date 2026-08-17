import { beforeEach, describe, expect, it, vi } from 'vitest';
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
import AuthorizedPickupsDialog from './AuthorizedPickupsDialog';

const user = userEvent.setup({ delay: null });

const STUDENT_ID = 12;
const SCHOOL_PATH = `/api/v1/schools/${SCHOOL_ID}/people/students/${STUDENT_ID}/authorized_pickups`;
const PORTAL_PATH = `/api/v1/schools/${SCHOOL_ID}/me/students/${STUDENT_ID}/authorized_pickups`;

const grandmother = {
  id: 1,
  student_id: STUDENT_ID,
  name: 'Avó Marta',
  cpf: '52998224725',
  phone: '62999990000',
  has_photo: true,
  photo_url: '/rails/active_storage/blobs/abc/marta.png',
  created_by_name: 'carol@example.com',
  created_at: '2026-08-17T12:00:00Z',
};

const driver = {
  ...grandmother,
  id: 2,
  name: 'Motorista João',
  cpf: '11144477735',
  phone: null,
  has_photo: false,
  photo_url: null,
};

const stubList = (path: string, rows: unknown[]) =>
  server.use(http.get(apiUrl(path), () => HttpResponse.json({ data: rows })));

beforeEach(() => {
  setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);
});

const renderDialog = (props: Partial<Parameters<typeof AuthorizedPickupsDialog>[0]> = {}) =>
  renderWithTheme(
    <AuthorizedPickupsDialog
      open
      schoolId={SCHOOL_ID}
      studentId={STUDENT_ID}
      studentName="Mariana Sales"
      onClose={vi.fn()}
      {...props}
    />,
  );

describe('AuthorizedPickupsDialog', () => {
  it('names everyone allowed to collect the child', async () => {
    stubList(SCHOOL_PATH, [grandmother, driver]);

    renderDialog();

    expect(await screen.findByText('Avó Marta')).toBeInTheDocument();
    expect(screen.getByText('Motorista João')).toBeInTheDocument();
  });

  it('shows the CPF formatted, and the phone when there is one', async () => {
    stubList(SCHOOL_PATH, [grandmother]);

    renderDialog();

    expect(await screen.findByText('529.982.247-25 — 62999990000')).toBeInTheDocument();
  });

  // Whoever is at the gate has to be recognised by somebody who never met them.
  it('opens the photo on demand', async () => {
    stubList(SCHOOL_PATH, [grandmother]);

    renderDialog();

    await user.click(await screen.findByRole('button', { name: 'Ver foto' }));

    const photo = await screen.findByAltText('Foto de Avó Marta');
    expect(photo).toHaveAttribute('src', expect.stringContaining('marta.png'));
  });

  it('says so when somebody has no photo', async () => {
    stubList(SCHOOL_PATH, [driver]);

    renderDialog();

    expect(await screen.findByText('Sem foto')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ver foto' })).not.toBeInTheDocument();
  });

  it('says plainly when nobody is authorised', async () => {
    stubList(SCHOOL_PATH, []);

    renderDialog();

    expect(await screen.findByText('Ninguém autorizado ainda')).toBeInTheDocument();
  });

  // The family authorises; a staff member who could add a name here would be letting a stranger
  // through the gate with the record saying it was allowed all along.
  it('offers the school no way to authorise or withdraw anybody', async () => {
    stubList(SCHOOL_PATH, [grandmother]);

    renderDialog();
    await screen.findByText('Avó Marta');

    expect(screen.queryByRole('button', { name: 'Autorizar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remover autorização/ })).not.toBeInTheDocument();
  });

  describe('the family managing the list', () => {
    // The body is read as raw text: `request.formData()` throws under this test environment. The
    // filename is asserted only by its content type — undici's serialisation renames the part to
    // "blob" here, which is an artefact of the environment rather than of what is sent.
    it('authorises somebody, photo included', async () => {
      let body = '';
      stubList(PORTAL_PATH, []);
      server.use(
        http.post(apiUrl(PORTAL_PATH), async ({ request }) => {
          body = await request.text();
          return HttpResponse.json({ data: grandmother }, { status: 201 });
        }),
      );

      renderDialog({ asGuardian: true });

      await user.type(await screen.findByLabelText(/^Nome/), 'Avó Marta');
      await user.type(screen.getByLabelText(/^CPF/), '529.982.247-25');
      await user.upload(
        screen.getByLabelText('Escolher foto'),
        new File(['x'], 'marta.png', { type: 'image/png' }),
      );
      await user.click(screen.getByRole('button', { name: 'Autorizar' }));

      await waitFor(() => expect(body).toContain('Avó Marta'));
      expect(body).toContain('name="authorized_pickup[cpf]"');
      expect(body).toContain('name="authorized_pickup[photo]"');
      expect(body).toContain('Content-Type: image/png');
    });

    it('refuses to send somebody with no name', async () => {
      let called = false;
      stubList(PORTAL_PATH, []);
      server.use(
        http.post(apiUrl(PORTAL_PATH), () => {
          called = true;
          return HttpResponse.json({ data: grandmother }, { status: 201 });
        }),
      );

      renderDialog({ asGuardian: true });

      await user.type(await screen.findByLabelText(/^CPF/), '529.982.247-25');
      await user.click(screen.getByRole('button', { name: 'Autorizar' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('Informe o nome.');
      expect(called).toBe(false);
    });

    it('reports a refusal from the API instead of looking saved', async () => {
      stubList(PORTAL_PATH, []);
      server.use(
        http.post(apiUrl(PORTAL_PATH), () =>
          HttpResponse.json(
            { error: { code: 'validation_error', message: 'CPF inválido.', details: {} } },
            { status: 422 },
          ),
        ),
      );

      renderDialog({ asGuardian: true });

      await user.type(await screen.findByLabelText(/^Nome/), 'Avó Marta');
      await user.type(screen.getByLabelText(/^CPF/), '111.111.111-11');
      await user.click(screen.getByRole('button', { name: 'Autorizar' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('CPF inválido.');
    });

    // Withdrawing somebody is confirmed: it decides who gets turned away at the gate.
    it('withdraws somebody after the family confirms', async () => {
      let deleted = false;
      stubList(PORTAL_PATH, [grandmother]);
      server.use(
        http.delete(apiUrl(`${PORTAL_PATH}/${grandmother.id}`), () => {
          deleted = true;
          return new HttpResponse(null, { status: 204 });
        }),
      );

      renderDialog({ asGuardian: true });

      await user.click(
        await screen.findByRole('button', { name: 'Remover autorização de Avó Marta' }),
      );
      const confirm = await screen.findByRole('dialog', { name: /Remover esta autorização/ });
      await user.click(within(confirm).getByRole('button', { name: 'Remover' }));

      await waitFor(() => expect(deleted).toBe(true));
    });

    it('withdraws nobody until the family confirms', async () => {
      let deleted = false;
      stubList(PORTAL_PATH, [grandmother]);
      server.use(
        http.delete(apiUrl(`${PORTAL_PATH}/${grandmother.id}`), () => {
          deleted = true;
          return new HttpResponse(null, { status: 204 });
        }),
      );

      renderDialog({ asGuardian: true });

      await user.click(
        await screen.findByRole('button', { name: 'Remover autorização de Avó Marta' }),
      );
      const confirm = await screen.findByRole('dialog', { name: /Remover esta autorização/ });
      await user.click(within(confirm).getByRole('button', { name: 'Cancelar' }));

      expect(deleted).toBe(false);
    });
  });

  it('says so when the list cannot be loaded', async () => {
    server.use(http.get(apiUrl(SCHOOL_PATH), () => HttpResponse.error()));

    renderDialog();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar a lista.',
    );
  });

  it('fetches nothing while it is closed', async () => {
    let called = false;
    server.use(
      http.get(apiUrl(SCHOOL_PATH), () => {
        called = true;
        return HttpResponse.json({ data: [] });
      }),
    );

    renderDialog({ open: false });

    expect(called).toBe(false);
  });
});
