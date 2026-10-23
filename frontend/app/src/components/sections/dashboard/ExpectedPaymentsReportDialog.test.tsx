import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, SCHOOL_ID, apiUrl, http, jsonError, server } from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { setAccessToken } from 'services/tokenStore';
import ExpectedPaymentsReportDialog from './ExpectedPaymentsReportDialog';

const PATH = `/api/v1/schools/${SCHOOL_ID}/billing/reports/expected_payments`;

const user = userEvent.setup({ delay: null });

const stub = () => {
  const asked: URLSearchParams[] = [];

  server.use(
    http.get(apiUrl(PATH), ({ request }) => {
      asked.push(new URL(request.url).searchParams);
      return HttpResponse.arrayBuffer(new TextEncoder().encode('%PDF-1.4').buffer, {
        headers: { 'Content-Type': 'application/pdf' },
      });
    }),
  );

  return asked;
};

const renderDialog = () => {
  setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');
  const onClose = vi.fn();

  renderWithTheme(<ExpectedPaymentsReportDialog open schoolId={SCHOOL_ID} onClose={onClose} />);

  return { onClose };
};

describe('ExpectedPaymentsReportDialog', () => {
  it('offers every column the report can draw, with the default ones ticked', () => {
    stub();
    renderDialog();

    expect(screen.getByRole('checkbox', { name: 'Aluno' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Responsáveis' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Valor previsto (mensal)' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Plano' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Assinatura' })).not.toBeChecked();
  });

  it('asks for the default columns and every class when nothing is changed', async () => {
    const asked = stub();
    const { onClose } = renderDialog();

    await user.click(screen.getByRole('button', { name: /gerar pdf/i }));

    await waitFor(() => expect(asked.length).toBe(1));
    expect(asked[0].get('columns')).toBe('student,guardians,expected_amount');
    expect(asked[0].has('school_class_id')).toBe(false);
    expect(asked[0].has('status')).toBe(false);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('asks only for the ticked columns, the chosen class and the chosen status', async () => {
    const asked = stub();
    renderDialog();

    await user.click(screen.getByRole('checkbox', { name: 'Plano' }));
    await user.click(screen.getByRole('checkbox', { name: 'Responsáveis' }));

    await user.click(screen.getByRole('combobox', { name: 'Turma' }));
    await user.click(await screen.findByRole('option', { name: /6º ano A/ }));

    await user.click(screen.getByRole('combobox', { name: 'Situação' }));
    await user.click(await screen.findByRole('option', { name: 'Transferido' }));

    await user.click(screen.getByRole('button', { name: /gerar pdf/i }));

    await waitFor(() => expect(asked.length).toBe(1));
    expect(asked[0].get('columns')).toBe('student,expected_amount,plan');
    expect(asked[0].get('school_class_id')).toBe('310');
    expect(asked[0].get('status')).toBe('transferred');
  });

  it('lists "Todas as turmas" first in the class select', async () => {
    stub();
    renderDialog();

    await user.click(screen.getByRole('combobox', { name: 'Turma' }));

    const options = await screen.findAllByRole('option');
    expect(options[0]).toHaveTextContent('Todas as turmas');
  });

  it('cannot be generated with no column ticked', async () => {
    stub();
    renderDialog();

    await user.click(screen.getByRole('checkbox', { name: 'Aluno' }));
    await user.click(screen.getByRole('checkbox', { name: 'Responsáveis' }));
    await user.click(screen.getByRole('checkbox', { name: 'Valor previsto (mensal)' }));

    expect(screen.getByRole('button', { name: /gerar pdf/i })).toBeDisabled();
  });

  it('warns that totals need the amount column', async () => {
    stub();
    renderDialog();

    await user.click(screen.getByRole('checkbox', { name: 'Valor previsto (mensal)' }));

    expect(screen.getByText(/só aparecem com a coluna de valor previsto/i)).toBeInTheDocument();
  });

  it('shows the API message and stays open when the report is refused', async () => {
    server.use(
      http.get(apiUrl(PATH), () =>
        jsonError(403, 'module_disabled', 'O módulo de cobrança está desativado.'),
      ),
    );
    const { onClose } = renderDialog();

    await user.click(screen.getByRole('button', { name: /gerar pdf/i }));

    expect(await screen.findByText('O módulo de cobrança está desativado.')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
