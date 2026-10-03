import { beforeEach, describe, expect, it } from 'vitest';
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
  staffMembership,
} from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { setAccessToken } from 'services/tokenStore';
import { TeacherHealthProfile } from 'types/academics';
import MyHealthProfile from './MyHealthProfile';

const user = userEvent.setup({ delay: null });

const teacherMembership = { ...staffMembership, role: 'teacher' };

const PATH = `/api/v1/schools/${SCHOOL_ID}/academics/me/teacher_health_profile`;

/** What the API answers for a teacher who has never filled this in (BR-CH01). */
const emptyProfile: TeacherHealthProfile = {
  id: 1,
  teacher_id: 7,
  teacher_name: 'Ana Souza',
  blood_type: null,
  health_plan_name: null,
  health_plan_number: null,
  emergency_contact_name: null,
  emergency_contact_phone: null,
  special_care_notes: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const stubProfile = (profile: TeacherHealthProfile = emptyProfile) =>
  server.use(http.get(apiUrl(PATH), () => HttpResponse.json({ data: profile })));

const stubSave = () => {
  const bodies: Record<string, unknown>[] = [];

  server.use(
    http.put(apiUrl(PATH), async ({ request }) => {
      const body = (await request.json()) as { health_profile: Record<string, unknown> };
      bodies.push(body.health_profile);

      return HttpResponse.json({ data: { ...emptyProfile, ...body.health_profile } });
    }),
  );

  return bodies;
};

beforeEach(() => {
  setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);
});

const renderPage = () =>
  renderWithTheme(<MyHealthProfile />, { memberships: [teacherMembership] });

describe('MyHealthProfile page', () => {
  it('opens empty for a teacher who has never filled this in', async () => {
    stubProfile();

    renderPage();

    await screen.findByRole('combobox', { name: 'Tipo sanguíneo' });
    expect(screen.getByLabelText('Plano de saúde')).toHaveValue('');
  });

  it('shows the profile after it has been filled in', async () => {
    stubProfile({ ...emptyProfile, blood_type: 'O+', health_plan_name: 'Amil' });

    renderPage();

    expect(await screen.findByRole('combobox', { name: 'Tipo sanguíneo' })).toHaveTextContent(
      'O+',
    );
    expect(screen.getByLabelText('Plano de saúde')).toHaveValue('Amil');
  });

  it('lets the teacher edit and save their own profile', async () => {
    stubProfile();
    const bodies = stubSave();

    renderPage();

    await user.type(await screen.findByLabelText('Plano de saúde'), 'Amil');
    await user.type(screen.getByLabelText('Contato de emergência'), 'Marina');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toMatchObject({ health_plan_name: 'Amil', emergency_contact_name: 'Marina' });
    expect(await screen.findByText('Ficha salva.')).toBeInTheDocument();
  });

  it('says so when the profile cannot be loaded', async () => {
    server.use(http.get(apiUrl(PATH), () => HttpResponse.error()));

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar a ficha de saúde.',
    );
  });
});
