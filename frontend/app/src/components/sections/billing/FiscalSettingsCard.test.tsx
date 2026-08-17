import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  HttpResponse,
  SCHOOL_ID,
  apiUrl,
  fiscalSettingsFixture,
  http,
  server,
  supportedCitiesFixture,
} from 'test/msw';
import { renderWithTheme } from 'test/renderWithTheme';
import { setAccessToken } from 'services/tokenStore';
import FiscalSettingsCard from './FiscalSettingsCard';

const PATH = `/api/v1/schools/${SCHOOL_ID}/billing/fiscal_settings`;
const CITIES_PATH = `/api/v1/schools/${SCHOOL_ID}/billing/fiscal/supported_cities`;

const user = userEvent.setup({ delay: null });

const renderCard = () => {
  setAccessToken('fresh-access-token', '2026-08-04T23:20:00Z');

  return renderWithTheme(<FiscalSettingsCard schoolId={SCHOOL_ID} />);
};

describe('FiscalSettingsCard', () => {
  it('loads fiscal settings into the form', async () => {
    server.use(http.get(apiUrl(PATH), () => HttpResponse.json({ data: fiscalSettingsFixture })));

    renderCard();

    await waitFor(() =>
      expect(screen.getByLabelText(/código lc 116/i)).toHaveValue('8.01'),
    );
    expect(screen.getByLabelText(/alíquota iss/i)).toHaveValue('5');
  });

  it('shows dynamic municipal fields from provider options', async () => {
    server.use(
      http.get(apiUrl(PATH), () =>
        HttpResponse.json({
          data: {
            ...fiscalSettingsFixture,
            provider_options_snapshot: { requiredFields: ['city_service_code'] },
          },
        }),
      ),
    );

    renderCard();

    expect(await screen.findByLabelText(/código de serviço municipal/i)).toBeInTheDocument();
  });

  it('saves updated fiscal settings', async () => {
    let patched = false;

    server.use(
      http.get(apiUrl(PATH), () => HttpResponse.json({ data: fiscalSettingsFixture })),
      http.get(apiUrl(CITIES_PATH), () => HttpResponse.json({ data: supportedCitiesFixture })),
      http.patch(apiUrl(PATH), async ({ request }) => {
        patched = true;
        const body = (await request.json()) as { fiscal_settings: Record<string, unknown> };
        expect(body.fiscal_settings.enabled).toBe(true);
        return HttpResponse.json({
          data: { ...fiscalSettingsFixture, enabled: true },
        });
      }),
    );

    renderCard();

    await waitFor(() => expect(screen.getByLabelText(/código lc 116/i)).toBeInTheDocument());
    await user.click(screen.getByRole('switch'));
    await user.click(screen.getByRole('button', { name: /salvar nfs-e/i }));

    await waitFor(() => expect(patched).toBe(true));
    expect(screen.getByText(/configuração nfs-e salva/i)).toBeInTheDocument();
  });
});
