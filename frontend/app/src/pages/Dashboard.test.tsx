import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { HttpResponse, SCHOOL_ID, apiUrl, http, server, staffMembership } from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { AuthContext, AuthContextValue } from 'providers/AuthContext';
import { Membership } from 'types/auth';
import { DashboardMetrics } from 'types/dashboard';
import Dashboard from './Dashboard';

vi.mock('components/base/ReactEchart', () => ({
  default: ({ option }: { option: unknown }) => (
    <div data-testid="echart">{JSON.stringify(option)}</div>
  ),
}));

const DASHBOARD_PATH = `/api/v1/schools/${SCHOOL_ID}/dashboard`;
const TRANSACTIONS_PATH = `/api/v1/schools/${SCHOOL_ID}/billing/transactions`;

const emptyTransactions = () =>
  HttpResponse.json({ data: [], meta: { page: 1, per_page: 25, total: 0 } });

const teacherMembership: Membership = {
  id: 15,
  school_id: staffMembership.school_id,
  school_name: staffMembership.school_name,
  role: 'teacher',
  status: 'active',
  email: 'teacher@example.com',
  role_template: {
    id: 103,
    name: 'Professor',
    system_key: 'teacher',
    is_system: true,
  },
  is_owner: false,
  segment_id: null,
  display_title: 'Professor',
  permissions: ['teach'],
  permission_sources: { teach: 'template' },
};

const billingMembership: Membership = {
  ...staffMembership,
  permissions: ['manage_billing', 'view_billing_summary'],
  permission_sources: {
    manage_billing: 'template',
    view_billing_summary: 'template',
  },
};

const dashboardMetrics: DashboardMetrics = {
  month: '2026-08',
  students: { value: 42, previous: 40, change_percent: 5, is_up: true },
  collaborators: { value: 10, previous: 8, change_percent: 25, is_up: true },
  average_ticket: {
    value: 50000,
    previous: 48000,
    change_percent: 4.2,
    is_up: true,
    total_monthly_cents: 2100000,
    students: 42,
  },
  monthly_revenue: { value: 2100000, previous: 2000000, change_percent: 5, is_up: true },
  didactic_material: { value: 100000, previous: 90000, change_percent: 11.1, is_up: true },
  monthly_income_series: [{ month: '2026-08', amount_cents: 2100000 }],
  students_by_class: [
    {
      school_class_id: 1,
      name: 'Turma A',
      grade_level: '1',
      year: 2026,
      students: 20,
    },
  ],
};

const authValueFor = (membership: Membership): AuthContextValue => ({
  user: {
    id: 1,
    email: membership.email ?? 'user@example.com',
    status: 'active',
    memberships: [membership],
    guardian_profiles: [],
  },
  status: 'authenticated',
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
});

const renderDashboard = (membership: Membership) =>
  renderWithTheme(
    <MemoryRouter>
      <AuthContext.Provider value={authValueFor(membership)}>
        <Dashboard />
      </AuthContext.Provider>
    </MemoryRouter>,
  );

describe('Dashboard permission gating', () => {
  it('shows billing sections to a user with billing access', async () => {
    server.use(
      http.get(apiUrl(DASHBOARD_PATH), () =>
        HttpResponse.json({ data: dashboardMetrics }),
      ),
      http.get(apiUrl(TRANSACTIONS_PATH), () => emptyTransactions()),
    );

    renderDashboard(billingMembership);

    await waitFor(() => {
      expect(screen.getByText('Receita do mês')).toBeInTheDocument();
    });
    expect(screen.getByText('Entradas da escola ao longo do ano')).toBeInTheDocument();
    expect(screen.getByText('Entradas e saídas')).toBeInTheDocument();
    expect(screen.queryByText('$240.8K')).not.toBeInTheDocument();
    expect(screen.queryByText('iPhone 14 Pro Max')).not.toBeInTheDocument();
  });

  it('shows the people section to a secretary with manage_people', async () => {
    server.use(
      http.get(apiUrl(DASHBOARD_PATH), () =>
        HttpResponse.json({ data: dashboardMetrics }),
      ),
      http.get(apiUrl(TRANSACTIONS_PATH), () => emptyTransactions()),
    );

    renderDashboard(staffMembership);

    await waitFor(() => {
      expect(screen.getByText('Alunos por turma')).toBeInTheDocument();
    });
    expect(screen.queryByText('Receita do mês')).not.toBeInTheDocument();
    expect(screen.queryByText('Entradas e saídas')).not.toBeInTheDocument();
  });

  it('shows a welcome state to a teacher without billing or people access', () => {
    renderDashboard(teacherMembership);

    expect(screen.getByText('Bem-vindo ao School Lab')).toBeInTheDocument();
    expect(screen.queryByText('Receita do mês')).not.toBeInTheDocument();
    expect(screen.queryByText('Alunos por turma')).not.toBeInTheDocument();
    expect(screen.queryByText('$240.8K')).not.toBeInTheDocument();
  });
});
