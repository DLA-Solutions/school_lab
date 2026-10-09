import { request } from '../api';
import { fetchChargeHistory, fetchOpenCharges } from '../charges';
import { Charge, ChargeListResponse } from '../../types/charges';

jest.mock('../api', () => ({
  request: jest.fn(),
}));

const mockedRequest = request as jest.MockedFunction<typeof request>;

const buildCharge = (overrides: Partial<Charge>): Charge => ({
  id: 1,
  billing_period: '2026-10',
  total_amount_cents: 85000,
  due_date: '2026-10-10',
  status: 'pending',
  kind: 'tuition',
  description: 'Mensalidade',
  billing_purpose_id: 1,
  billing_purpose_code: 'tuition',
  tax_declaration_eligible: true,
  student: { id: 1, name: 'Pedro Silva' },
  contract_id: 1,
  interest_rate_percent: null,
  payment_methods: { boleto_url: null, pix_copy_paste: null },
  ...overrides,
});

describe('fetchOpenCharges', () => {
  beforeEach(() => {
    mockedRequest.mockReset();
  });

  it('excludes paid charges from the open list even when the API returns them', async () => {
    const pending = buildCharge({ id: 1, status: 'pending' });
    const overdue = buildCharge({ id: 2, status: 'overdue' });
    const paid = buildCharge({ id: 3, status: 'paid' });

    const response: ChargeListResponse<Charge> = {
      data: [pending, overdue, paid],
      meta: { page: 1, per_page: 25, total: 3 },
    };
    mockedRequest.mockResolvedValueOnce(response);

    const result = await fetchOpenCharges(42);

    expect(result.data).toEqual([pending, overdue]);
    expect(result.data.some((charge) => charge.status === 'paid')).toBe(false);
  });

  it('requests the unified me/charges endpoint without a status param', async () => {
    mockedRequest.mockResolvedValueOnce({
      data: [],
      meta: { page: 1, per_page: 25, total: 0 },
    });

    await fetchOpenCharges(42);

    expect(mockedRequest).toHaveBeenCalledWith('/schools/42/me/charges');
  });

  it('returns an empty list when every charge the API returns is already paid', async () => {
    const paid = buildCharge({ id: 3, status: 'paid' });
    mockedRequest.mockResolvedValueOnce({
      data: [paid],
      meta: { page: 1, per_page: 25, total: 1 },
    });

    const result = await fetchOpenCharges(42);

    expect(result.data).toEqual([]);
  });
});

describe('fetchChargeHistory', () => {
  beforeEach(() => {
    mockedRequest.mockReset();
  });

  it('calls the history endpoint and passes the response through unfiltered', async () => {
    const response = {
      data: [{ id: 88, status: 'paid' }],
      meta: { page: 1, per_page: 25, total: 1 },
    };
    mockedRequest.mockResolvedValueOnce(response);

    const result = await fetchChargeHistory(42);

    expect(mockedRequest).toHaveBeenCalledWith('/schools/42/me/charges/history');
    expect(result).toEqual(response);
  });
});
