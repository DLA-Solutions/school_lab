import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { HttpResponse, SCHOOL_ID, apiUrl, guardianMembership, http, server } from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { setAccessToken } from 'services/tokenStore';
import MyDailyRoutine from './MyDailyRoutine';

const ME = `/api/v1/schools/${SCHOOL_ID}/me`;

const page = <T,>(rows: T[]) => ({
  data: rows,
  meta: { page: 1, per_page: 100, total: rows.length },
});

const renderPage = () => {
  setAccessToken('fresh-access-token', '2026-10-04T23:20:00Z');

  return renderWithTheme(
    <MemoryRouter initialEntries={['/rotina']}>
      <MyDailyRoutine />
    </MemoryRouter>,
    { memberships: [guardianMembership] },
  );
};

describe('My daily routine, as the family reads the day', () => {
  it('tells the story of a sent day and skips a child with no routine', async () => {
    server.use(
      http.get(apiUrl(`${ME}/daily_routines`), () =>
        HttpResponse.json(
          page([
            {
              id: 6,
              student_id: 9,
              school_class_id: 8,
              date: '2026-10-04',
              status: 'sent',
              narrative: 'Pintou com as mãos.',
              meal_lunch: 'regular',
              discomfort: 'yes',
              discomfort_detail: 'Reclamou da barriga depois do almoço.',
              attachment_ids: [],
            },
          ]),
        ),
      ),
      http.get(apiUrl(`${ME}/conversations`), () =>
        HttpResponse.json(
          page([
            {
              student_id: 9,
              student_name: 'Ana Lima',
              school_class_id: 8,
              conversation_id: 40,
              last_message_at: '2026-10-04T18:00:00Z',
            },
            {
              student_id: 21,
              student_name: 'Bruno Lima',
              school_class_id: 4,
              conversation_id: null,
              last_message_at: null,
            },
          ]),
        ),
      ),
    );

    renderPage();

    expect(await screen.findByText('Pintou com as mãos.')).toBeInTheDocument();
    expect(screen.getByText(/Almoço: Regular/)).toBeInTheDocument();
    expect(screen.getByText('Reclamou da barriga depois do almoço.')).toBeInTheDocument();
    expect(screen.queryByText(/^Sono$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Manhã:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Bruno Lima/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /responder na conversa/i })).toHaveAttribute(
      'href',
      '/mensagens?student_id=9',
    );
  });

  it('does not invent a routine entry when nothing was sent', async () => {
    server.use(
      http.get(apiUrl(`${ME}/daily_routines`), () => HttpResponse.json(page([]))),
      http.get(apiUrl(`${ME}/conversations`), () =>
        HttpResponse.json(
          page([
            {
              student_id: 21,
              student_name: 'Bruno Lima',
              school_class_id: 4,
              conversation_id: null,
              last_message_at: null,
            },
          ]),
        ),
      ),
    );

    renderPage();

    expect(await screen.findByText('Nenhuma rotina enviada')).toBeInTheDocument();
    expect(screen.queryByText(/Bruno Lima/)).not.toBeInTheDocument();
  });
});
