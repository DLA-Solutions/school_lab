import { beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
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
import { Teacher, TeacherHealthProfile } from 'types/academics';
import CollaboratorHealthProfileDialog from './CollaboratorHealthProfileDialog';

const teacher: Teacher = {
  id: 9,
  school_id: SCHOOL_ID,
  name: 'Carla Nogueira',
  cpf: '15852119075',
  email: 'carla@example.com',
  phone: null,
  job_position_id: 3,
  job_title: 'Professora',
  hired_on: '2024-02-01',
  zip_code: null,
  street: null,
  number: null,
  complement: null,
  neighborhood: null,
  city: null,
  state: null,
  classes: [],
};

const PATH = `/api/v1/schools/${SCHOOL_ID}/academics/teachers/${teacher.id}/health_profile`;

/** What the API answers for a collaborator nobody has filled in yet (BR-CH03). */
const emptyProfile: TeacherHealthProfile = {
  id: 1,
  teacher_id: teacher.id,
  teacher_name: teacher.name,
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

beforeEach(() => {
  setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);
});

const renderDialog = () =>
  renderWithTheme(
    <CollaboratorHealthProfileDialog
      open
      schoolId={SCHOOL_ID}
      teacher={teacher}
      onClose={() => {}}
    />,
  );

describe('CollaboratorHealthProfileDialog', () => {
  it('opens empty for a collaborator nobody has filled in yet', async () => {
    stubProfile();

    renderDialog();

    await screen.findByRole('combobox', { name: 'Tipo sanguíneo' });
    expect(screen.getByLabelText('Plano de saúde')).toHaveValue('');
  });

  it('shows what the collaborator reported, read-only', async () => {
    stubProfile({
      ...emptyProfile,
      blood_type: 'B+',
      health_plan_name: 'Amil',
      emergency_contact_name: 'Beatriz',
      special_care_notes: 'Allergic to penicillin',
    });

    renderDialog();

    expect(await screen.findByRole('combobox', { name: 'Tipo sanguíneo' })).toHaveTextContent(
      'B+',
    );
    expect(screen.getByLabelText('Plano de saúde')).toHaveValue('Amil');
    expect(screen.getByLabelText('Contato de emergência')).toHaveValue('Beatriz');
    // Read-only: every field is disabled and there is no save action.
    expect(screen.getByLabelText('Plano de saúde')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Salvar' })).not.toBeInTheDocument();
  });

  it('names the collaborator in the dialog title', async () => {
    stubProfile();

    renderDialog();
    await screen.findByLabelText('Tipo sanguíneo');

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Carla Nogueira')).toBeInTheDocument();
  });

  it('says so when the profile cannot be loaded', async () => {
    server.use(http.get(apiUrl(PATH), () => HttpResponse.error()));

    renderDialog();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar a ficha de saúde.',
    );
  });
});
