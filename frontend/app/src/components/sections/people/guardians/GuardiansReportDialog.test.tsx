import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, SCHOOL_ID, apiUrl, http, jsonError, server } from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { setAccessToken } from 'services/tokenStore';
import GuardiansReportDialog from './GuardiansReportDialog';

const PATH = `/api/v1/schools/${SCHOOL_ID}/people/guardians/report`;

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

const renderDialog = (props: Partial<Parameters<typeof GuardiansReportDialog>[0]> = {}) => {
  setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');
  const onClose = vi.fn();

  renderWithTheme(
    <GuardiansReportDialog
      open
      schoolId={SCHOOL_ID}
      search=""
      status="active"
      onClose={onClose}
      {...props}
    />,
  );

  return { onClose };
};

describe('GuardiansReportDialog', () => {
  it('offers every column the report can draw', async () => {
    stub();
    renderDialog();

    expect(await screen.findByRole('checkbox', { name: 'Nome' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /^cpf$/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /telefone/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /nome do filho/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /turma do filho/i })).toBeInTheDocument();
  });

  it('asks only for the columns that are ticked', async () => {
    const asked = stub();
    renderDialog();

    // Off by default, and the e-mail is left out here on purpose.
    await user.click(screen.getByRole('checkbox', { name: /telefone/i }));
    await user.click(screen.getByRole('button', { name: /gerar pdf/i }));

    await waitFor(() => expect(asked.length).toBe(1));
    const columns = asked[0].get('columns')?.split(',') ?? [];
    expect(columns).toContain('name');
    expect(columns).toContain('student_class');
    expect(columns).not.toContain('phone');
  });

  // A report that ignored the search would disagree with the screen it was asked for from.
  it('carries the listing filters', async () => {
    const asked = stub();
    renderDialog({ search: 'Silva', status: 'inactive' });

    await user.click(screen.getByRole('button', { name: /gerar pdf/i }));

    await waitFor(() => expect(asked.length).toBe(1));
    expect(asked[0].get('q')).toBe('Silva');
    expect(asked[0].get('status')).toBe('inactive');
  });

  it('closes once the file has been handed over', async () => {
    stub();
    const { onClose } = renderDialog();

    await user.click(screen.getByRole('button', { name: /gerar pdf/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('will not generate a report with no columns at all', async () => {
    stub();
    renderDialog();

    for (const name of ['Nome', 'CPF', 'Telefone', 'Nome do filho matriculado', 'Turma do filho']) {
      const box = screen.getByRole('checkbox', { name });
      if ((box as HTMLInputElement).checked) {
        await user.click(box);
      }
    }

    expect(screen.getByRole('button', { name: /gerar pdf/i })).toBeDisabled();
  });

  // A name Prawn's built-in fonts cannot draw comes back as a refusal, not a download.
  it('reports what the API refused', async () => {
    server.use(
      http.get(apiUrl(PATH), () =>
        jsonError(422, 'validation_error', 'O relatório traz caracteres que a fonte do PDF não desenha.'),
      ),
    );

    renderDialog();
    await user.click(screen.getByRole('button', { name: /gerar pdf/i }));

    expect(await screen.findByText(/caracteres que a fonte do pdf/i)).toBeInTheDocument();
  });
});
