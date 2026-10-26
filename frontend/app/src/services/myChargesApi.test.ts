import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ACCESS_EXPIRES_AT, FRESH_ACCESS_TOKEN, SCHOOL_ID, server } from 'test/msw';
import { listMyCharges } from './myChargesApi';
import { clearAccessToken, setAccessToken } from './tokenStore';

/** Query strings of every `GET .../me/charges` the module sends. */
const recordQueries = () => {
  const queries: URLSearchParams[] = [];

  server.events.on('request:start', ({ request }) => {
    const url = new URL(request.url);
    if (url.pathname.endsWith('/me/charges')) {
      queries.push(url.searchParams);
    }
  });

  return queries;
};

describe('services/myChargesApi listMyCharges', () => {
  beforeEach(() => {
    clearAccessToken();
    setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);
  });

  afterEach(() => {
    server.events.removeAllListeners();
  });

  it('always opts into the unified list with status=all', async () => {
    const queries = recordQueries();

    const page = await listMyCharges({ schoolId: SCHOOL_ID, status: 'all' });

    expect(Object.fromEntries(queries[0])).toEqual({ page: '1', status: 'all' });
    expect(page.data.map((row) => row.status).sort()).toEqual([
      'overdue',
      'paid',
      'pending',
      'pending',
    ]);
  });

  it('joins an explicit status list with commas', async () => {
    const queries = recordQueries();

    await listMyCharges({ schoolId: SCHOOL_ID, status: ['pending', 'overdue'] });

    expect(queries[0].get('status')).toBe('pending,overdue');
  });

  it('sends month and year, and a year alone for the whole calendar year', async () => {
    const queries = recordQueries();

    await listMyCharges({
      schoolId: SCHOOL_ID,
      status: 'all',
      period: { kind: 'month', year: 2026, month: 8 },
    });
    await listMyCharges({
      schoolId: SCHOOL_ID,
      status: 'all',
      period: { kind: 'month', year: 2026 },
    });

    expect(Object.fromEntries(queries[0])).toMatchObject({ month: '8', year: '2026' });
    expect(queries[0].has('from')).toBe(false);
    expect(queries[1].get('year')).toBe('2026');
    expect(queries[1].has('month')).toBe(false);
  });

  it('sends from and to, either alone, and never month or year with them', async () => {
    const queries = recordQueries();

    await listMyCharges({
      schoolId: SCHOOL_ID,
      status: 'all',
      period: { kind: 'range', from: '2026-07-01', to: '2026-08-31' },
    });
    await listMyCharges({
      schoolId: SCHOOL_ID,
      status: 'all',
      period: { kind: 'range', from: '2026-07-01' },
    });

    expect(Object.fromEntries(queries[0])).toMatchObject({
      from: '2026-07-01',
      to: '2026-08-31',
    });
    expect(queries[0].has('month') || queries[0].has('year')).toBe(false);
    expect(queries[1].get('from')).toBe('2026-07-01');
    expect(queries[1].has('to')).toBe(false);
  });

  it('narrows to a linked child and a page', async () => {
    const queries = recordQueries();

    await listMyCharges({ schoolId: SCHOOL_ID, status: 'all', studentId: 2, page: 3 });

    expect(Object.fromEntries(queries[0])).toEqual({ page: '3', status: 'all', student_id: '2' });
  });
});
