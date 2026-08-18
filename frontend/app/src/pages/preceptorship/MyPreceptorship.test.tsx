import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import {
  HttpResponse,
  SCHOOL_ID,
  apiUrl,
  guardianMembership,
  http,
  server,
  staffMembership,
} from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { withActiveMembership } from 'test/activeMembership';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { setAccessToken } from 'services/tokenStore';
import { AuthUser, Membership } from 'types/auth';
import { PreceptorshipReport } from 'types/preceptorshipReport';
import MyPreceptorship from './MyPreceptorship';

const BASE = `/api/v1/schools/${SCHOOL_ID}/me/preceptorship_reports`;

const user = userEvent.setup({ delay: null });

const guardianUser: AuthUser = {
  id: 2,
  email: 'guardian@example.com',
  status: 'active',
  memberships: [guardianMembership],
  guardian_profiles: [{ id: 5 }],
};

const authValue: AuthContextValue = {
  user: guardianUser,
  status: 'authenticated',
  isAuthenticated: true,
  login: vi.fn(),
  loginWithGoogle: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
};

const pedroReport: PreceptorshipReport = {
  id: 2,
  school_id: SCHOOL_ID,
  status: 'published',
  body: 'Pedro tem participado bem das aulas e ajudado os colegas.',
  published_at: '2026-08-11T12:00:00Z',
  created_at: '2026-08-10T12:00:00Z',
  updated_at: '2026-08-11T12:00:00Z',
  student_id: 9,
  teacher_id: 3,
  academic_period_id: null,
  student_name: 'Pedro Silva',
  teacher_name: 'Carla Souza',
  period_name: null,
  editable: false,
};

const anaReport: PreceptorshipReport = {
  ...pedroReport,
  id: 3,
  student_id: 10,
  student_name: 'Ana Silva',
  body: 'Ana tem se dedicado às atividades em grupo.',
  teacher_name: 'Bruno Lima',
};

const stub = (rows: PreceptorshipReport[] = [pedroReport]) => {
  const downloads: string[] = [];

  server.use(
    http.get(apiUrl(BASE), () =>
      HttpResponse.json({ data: rows, meta: { page: 1, per_page: 25, total: rows.length } }),
    ),
    http.get(apiUrl(`${BASE}/:id/pdf`), ({ params }) => {
      downloads.push(String(params.id));
      return HttpResponse.arrayBuffer(new ArrayBuffer(8), {
        headers: { 'Content-Type': 'application/pdf' },
      });
    }),
  );

  return downloads;
};

const renderPage = (
  memberships: Membership[] = [guardianMembership],
  selectedId?: number,
) => {
  setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');

  return renderWithTheme(
    withActiveMembership(memberships, selectedId ?? memberships[0]?.id)(
      <MemoryRouter initialEntries={['/preceptoria']}>
        <AuthContext.Provider value={authValue}>
          <MyPreceptorship />
        </AuthContext.Provider>
      </MemoryRouter>,
    ),
  );
};

describe('Preceptorship, as the family reads it', () => {
  // A parent should be able to read what the teacher wrote without first saving a file.
  it('puts the prose on the page rather than behind a download', async () => {
    stub();
    renderPage();

    expect(
      await screen.findByText('Pedro tem participado bem das aulas e ajudado os colegas.'),
    ).toBeInTheDocument();
  });

  it('says which child it is about and who wrote it', async () => {
    stub();
    renderPage();

    expect(await screen.findByText('Pedro Silva')).toBeInTheDocument();
    expect(screen.getByText(/carla souza/i)).toBeInTheDocument();
  });

  it('renders published reports for more than one linked child', async () => {
    stub([pedroReport, anaReport]);
    renderPage();

    expect(await screen.findByText('Pedro Silva')).toBeInTheDocument();
    expect(screen.getByText('Ana Silva')).toBeInTheDocument();
    expect(screen.getByText(/carla souza/i)).toBeInTheDocument();
    expect(screen.getByText(/bruno lima/i)).toBeInTheDocument();
  });

  // The PDF is for keeping and forwarding, which is a separate need from reading it.
  it('fetches the PDF when the family asks to keep a copy', async () => {
    const downloads = stub();
    // jsdom has no object-URL plumbing, and the download helper is not what is under test here.
    // Only the two methods are replaced — swapping the whole `URL` global would break the
    // `new URL(...)` that both the API client and the request mock rely on.
    const createObjectURL = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:stub');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    renderPage();

    await user.click(await screen.findByRole('button', { name: /baixar pdf/i }));

    await waitFor(() => expect(downloads).toEqual(['2']));

    createObjectURL.mockRestore();
    revokeObjectURL.mockRestore();
  });

  it('says so plainly when the school has published nothing yet', async () => {
    stub([]);
    renderPage();

    expect(await screen.findByText(/nenhum relatório ainda/i)).toBeInTheDocument();
  });
});

describe('MyPreceptorship active membership context', () => {
  const dualRoleAuth: AuthContextValue = {
    ...authValue,
    user: {
      ...guardianUser,
      memberships: [staffMembership, guardianMembership],
    },
  };

  const renderWithAuth = (
    memberships: Membership[],
    selectedId: number,
  ) => {
    setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');

    return renderWithTheme(
      withActiveMembership(memberships, selectedId)(
        <MemoryRouter initialEntries={['/preceptoria']}>
          <AuthContext.Provider value={dualRoleAuth}>
            <MyPreceptorship />
          </AuthContext.Provider>
        </MemoryRouter>,
      ),
    );
  };

  it('shows no-access when the active profile is staff rather than guardian', async () => {
    stub();
    renderWithAuth([staffMembership, guardianMembership], staffMembership.id);

    expect(await screen.findByText(/você não tem acesso à preceptoria desta escola/i)).toBeInTheDocument();
    expect(screen.queryByText('Pedro Silva')).not.toBeInTheDocument();
  });

  it('loads family reports only after the guardian profile is active', async () => {
    stub();
    renderWithAuth([staffMembership, guardianMembership], guardianMembership.id);

    expect(await screen.findByText('Pedro Silva')).toBeInTheDocument();
  });
});
