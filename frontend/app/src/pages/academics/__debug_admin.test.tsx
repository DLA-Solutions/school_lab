import { describe, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { HttpResponse, SCHOOL_ID, apiUrl, http, server } from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { setAccessToken } from 'services/tokenStore';
import InstructionalDaysAdminCalendar from 'components/sections/academics/InstructionalDaysAdminCalendar';

const YEARS_BASE = `/api/v1/schools/${SCHOOL_ID}/school_years`;
const user = userEvent.setup({ delay: null });

const activeYear = {
  id: 7,
  school_id: SCHOOL_ID,
  name: '2026',
  starts_on: '2026-02-01',
  ends_on: '2026-12-18',
  status: 'active',
};

describe('debug', () => {
  it('toggles', async () => {
    server.use(
      http.get(apiUrl(`${YEARS_BASE}/active`), () => HttpResponse.json({ data: activeYear })),
      http.get(apiUrl(`${YEARS_BASE}/${activeYear.id}/instructional_days`), () =>
        HttpResponse.json({ data: [{ date: '2026-02-10', instructional: true }] }),
      ),
    );
    setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');
    renderWithTheme(
      <MemoryRouter>
        <InstructionalDaysAdminCalendar schoolId={SCHOOL_ID} canManage />
      </MemoryRouter>,
    );

    await screen.findByText(/dias letivos/i);
    const day12 = await screen.findByRole('gridcell', { name: '12' });
    console.log('day12 disabled?', day12.hasAttribute('disabled'));
    await user.click(day12);
    screen.debug(screen.getByRole('button', { name: /salvar alterações/i }));
  });
});
