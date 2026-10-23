import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithTheme } from 'test/renderWithTheme';
import { AverageTicketMetric, DashboardMetrics } from 'types/dashboard';
import KPIs from './KPIs';

// Currency output separates the symbol with a no-break space; normalise it for matching.
const plain = (text: string | null) => (text ?? '').replace(/\s/g, ' ');

const averageTicket: AverageTicketMetric = {
  value: 50000,
  previous: 48000,
  change_percent: 4.2,
  is_up: true,
  total_monthly_cents: 2100000,
  students: 42,
  punctuality_value: 45000,
  punctuality_total_monthly_cents: 1890000,
  punctuality_percent: 10,
};

const metricsWith = (ticket: Partial<AverageTicketMetric> | undefined): DashboardMetrics => ({
  month: '2026-08',
  students: { value: 42, previous: 40, change_percent: 5, is_up: true },
  collaborators: { value: 10, previous: 8, change_percent: 25, is_up: true },
  average_ticket: ticket && ({ ...averageTicket, ...ticket } as AverageTicketMetric),
  monthly_revenue: { value: 2100000, previous: 2000000, change_percent: 5, is_up: true },
  didactic_material: { value: 100000, previous: 90000, change_percent: 11.1, is_up: true },
});

const renderKPIs = (metrics: DashboardMetrics) =>
  renderWithTheme(<KPIs metrics={metrics} loading={false} month="2026-08" onMonthChange={() => {}} />);

describe('KPIs average ticket', () => {
  it('shows the agreed average and the average with the punctuality discount', () => {
    renderKPIs(metricsWith({}));

    expect(screen.getByText('Ticket médio')).toBeInTheDocument();
    expect(plain(screen.getByText(/^R\$\s500,00$/).textContent)).toBe('R$ 500,00');

    const secondary = screen.getByTestId('kpi-average-ticket-secondary');
    expect(within(secondary).getByText('Com desconto pontualidade (10%)')).toBeInTheDocument();
    expect(plain(within(secondary).getByText(/450,00/).textContent)).toBe('R$ 450,00');
  });

  it('explains that the average is of the agreed amounts', () => {
    renderKPIs(metricsWith({}));

    expect(
      screen.getByText(/42 aluno\(s\) · média dos valores contratados, já com bolsas e descontos/),
    ).toBeInTheDocument();
  });

  it('formats a decimal percent the pt-BR way', () => {
    renderKPIs(metricsWith({ punctuality_percent: 7.5 }));

    expect(screen.getByText('Com desconto pontualidade (7,5%)')).toBeInTheDocument();
  });

  it('formats a percent sent as 10.0 as 10%', () => {
    renderKPIs(metricsWith({ punctuality_percent: 10.0 }));

    expect(screen.getByText('Com desconto pontualidade (10%)')).toBeInTheDocument();
  });

  it('hides the second value when the response lacks the punctuality fields', () => {
    const legacy: Partial<AverageTicketMetric> = { ...averageTicket };
    delete legacy.punctuality_value;
    delete legacy.punctuality_total_monthly_cents;
    delete legacy.punctuality_percent;
    renderKPIs({ ...metricsWith(undefined), average_ticket: legacy as AverageTicketMetric });

    expect(screen.queryByTestId('kpi-average-ticket-secondary')).not.toBeInTheDocument();
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
    expect(screen.queryByText(/desconto pontualidade/i)).not.toBeInTheDocument();
  });

  it('leaves the other cards without a second value', () => {
    renderKPIs(metricsWith({}));

    expect(screen.getAllByTestId(/-secondary$/)).toHaveLength(1);
    expect(screen.getByText('Total de alunos')).toBeInTheDocument();
    expect(screen.getByText('Receita do mês')).toBeInTheDocument();
    expect(screen.getByText('Material didático')).toBeInTheDocument();
  });
});
