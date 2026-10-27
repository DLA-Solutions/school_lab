import { describe, expect, it, vi } from 'vitest';
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
import { SchoolYear } from 'services/schoolYearsApi';
import { BillableStudent } from 'types/charge';
import StudentPickerDialog from './StudentPickerDialog';

const STUDENTS_PATH = `/api/v1/schools/${SCHOOL_ID}/billing/billable_students`;
const SCHOOL_YEARS_PATH = `/api/v1/schools/${SCHOOL_ID}/school_years`;

const user = userEvent.setup({ delay: null });

const pedro: BillableStudent = {
  student_id: 1,
  student_name: 'Pedro Silva',
  contract_id: 55,
  payer: { id: 7, name: 'Maria Silva', cpf: '12345678909' },
  without_contract: false,
  tags: [],
};

// Has contract history, but nothing billable: the old contract was cancelled and its replacement
// is still unsigned. Both tags apply at once — a real, confirmed case.
const diana: BillableStudent = {
  student_id: 2,
  student_name: 'Diana Rocha',
  contract_id: null,
  payer: null,
  without_contract: false,
  tags: ['cancelled', 'pending_signature'],
};

// Enrolled, with no contract at all — distinct from `diana`, who has contract history.
const carlos: BillableStudent = {
  student_id: 3,
  student_name: 'Carlos Lima',
  contract_id: null,
  payer: null,
  without_contract: true,
  tags: [],
};

const activeYear: SchoolYear = {
  id: 10,
  school_id: SCHOOL_ID,
  name: 'Ano Letivo 2026',
  starts_on: '2026-02-01',
  ends_on: '2026-12-15',
  status: 'active',
};

const renderDialog = (onSelect = vi.fn(), onSkip = vi.fn()) => {
  setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);

  renderWithTheme(
    <StudentPickerDialog
      open
      schoolId={SCHOOL_ID}
      onClose={vi.fn()}
      onSelect={onSelect}
      onSkip={onSkip}
    />,
  );

  return { onSelect, onSkip };
};

describe('StudentPickerDialog', () => {
  it('lists every enrolled student, eligible or not', async () => {
    server.use(http.get(apiUrl(STUDENTS_PATH), () => HttpResponse.json({ data: [pedro, diana, carlos] })));

    renderDialog();

    expect(await screen.findByText('Pedro Silva')).toBeInTheDocument();
    expect(screen.getByText('Diana Rocha')).toBeInTheDocument();
    expect(screen.getByText('Carlos Lima')).toBeInTheDocument();
  });

  it('offers a select action only for a student with a standing contract', async () => {
    server.use(http.get(apiUrl(STUDENTS_PATH), () => HttpResponse.json({ data: [pedro, diana, carlos] })));

    renderDialog();

    await screen.findByText('Pedro Silva');

    expect(screen.getByRole('button', { name: 'Selecionar Pedro Silva' })).toBeInTheDocument();

    const dianaRow = screen.getByText('Diana Rocha').closest('[role="row"]') as HTMLElement;
    const carlosRow = screen.getByText('Carlos Lima').closest('[role="row"]') as HTMLElement;

    expect(within(dianaRow).queryByRole('button', { name: /Selecionar/ })).not.toBeInTheDocument();
    expect(within(carlosRow).queryByRole('button', { name: /Selecionar/ })).not.toBeInTheDocument();
  });

  it('fires onSelect with the picked row', async () => {
    server.use(http.get(apiUrl(STUDENTS_PATH), () => HttpResponse.json({ data: [pedro] })));

    const { onSelect } = renderDialog();

    await user.click(await screen.findByRole('button', { name: 'Selecionar Pedro Silva' }));

    expect(onSelect).toHaveBeenCalledWith(pedro);
  });

  it('fires onSkip from its own action, without picking a row', async () => {
    server.use(http.get(apiUrl(STUDENTS_PATH), () => HttpResponse.json({ data: [pedro] })));

    const { onSkip } = renderDialog();

    await screen.findByText('Pedro Silva');
    await user.click(screen.getByRole('button', { name: 'Cobrar sem selecionar aluno' }));

    expect(onSkip).toHaveBeenCalled();
  });

  describe('a student with contract history but nothing billable', () => {
    it('shows both tags together, distinct from the no-contract-at-all case', async () => {
      server.use(http.get(apiUrl(STUDENTS_PATH), () => HttpResponse.json({ data: [diana, carlos] })));

      renderDialog();

      const dianaRow = (await screen.findByText('Diana Rocha')).closest(
        '[role="row"]',
      ) as HTMLElement;
      const carlosRow = screen.getByText('Carlos Lima').closest('[role="row"]') as HTMLElement;

      expect(within(dianaRow).getByText('Contrato cancelado')).toBeInTheDocument();
      expect(within(dianaRow).getByText('Aguardando assinatura')).toBeInTheDocument();
      expect(within(dianaRow).queryByText('Sem contrato')).not.toBeInTheDocument();

      expect(within(carlosRow).getByText('Sem contrato')).toBeInTheDocument();
      expect(within(carlosRow).queryByText('Contrato cancelado')).not.toBeInTheDocument();
    });

    it('surfaces a hint that it cannot be picked here', async () => {
      server.use(http.get(apiUrl(STUDENTS_PATH), () => HttpResponse.json({ data: [pedro, diana] })));

      renderDialog();

      await screen.findByText('Pedro Silva');

      expect(
        screen.getByText(/Alunos sem contrato ativo e assinado não podem ser selecionados aqui/),
      ).toBeInTheDocument();
    });
  });

  it('shows no payer for an eligible contract that has none, without claiming "without contract"', async () => {
    const noPayer: BillableStudent = { ...pedro, payer: null };

    server.use(http.get(apiUrl(STUDENTS_PATH), () => HttpResponse.json({ data: [noPayer] })));

    renderDialog();

    const row = (await screen.findByText('Pedro Silva')).closest('[role="row"]') as HTMLElement;

    expect(within(row).getByText('Sem responsável financeiro')).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Selecionar Pedro Silva' })).toBeInTheDocument();
  });

  it('shows an empty state when nothing is enrolled for the chosen year', async () => {
    server.use(http.get(apiUrl(STUDENTS_PATH), () => HttpResponse.json({ data: [] })));

    renderDialog();

    expect(await screen.findByText('Nenhum aluno encontrado')).toBeInTheDocument();
  });

  describe('school year filter', () => {
    it('defaults to the active year and sends it with the listing request', async () => {
      const requests: URL[] = [];

      server.use(
        http.get(apiUrl(SCHOOL_YEARS_PATH), () => HttpResponse.json({ data: [activeYear] })),
        http.get(apiUrl(`${SCHOOL_YEARS_PATH}/active`), () =>
          HttpResponse.json({ data: activeYear }),
        ),
        http.get(apiUrl(STUDENTS_PATH), ({ request }) => {
          requests.push(new URL(request.url));
          return HttpResponse.json({ data: [pedro] });
        }),
      );

      renderDialog();

      await screen.findByText('Pedro Silva');

      await waitFor(() =>
        expect(requests[requests.length - 1]?.searchParams.get('school_year_id')).toBe('10'),
      );
    });
  });
});
