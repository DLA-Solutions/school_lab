import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithTheme } from 'test/renderWithTheme';
import { Charge } from 'types/charge';
import { ApiError } from 'services/api';
import BoletoPreviewDialog from './BoletoPreviewDialog';

const user = userEvent.setup({ delay: null });

const BOLETO_URL = 'https://storage.googleapis.com/bank/boleto-abc.pdf';

const charge = (overrides: Partial<Charge> = {}): Charge => ({
  id: 529,
  billing_period: '2026-08-01',
  original_amount_cents: 1_200,
  discount_amount_cents: 0,
  late_fee_amount_cents: 0,
  total_amount_cents: 1_200,
  due_date: '2026-08-18',
  status: 'pending',
  kind: 'one_off',
  description: 'Avulso',
  boleto_url: BOLETO_URL,
  contract_id: null,
  student: null,
  guardian: { id: 7, name: 'Maria Silva', cpf: '12345678909' },
  ...overrides,
});

// jsdom has neither of these: the object URL is what the frame is pointed at, and the click is
// what a download is, so both have to be observable for any of this to be testable.
const objectUrls: Blob[] = [];
let revoked: string[] = [];

beforeEach(() => {
  objectUrls.length = 0;
  revoked = [];

  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: (blob: Blob) => {
      objectUrls.push(blob);
      return `blob:mock/${objectUrls.length}`;
    },
    revokeObjectURL: (url: string) => revoked.push(url),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const stubFetch = (response: Partial<Response>) =>
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response as Response));

const pdf = () => ({
  ok: true,
  status: 200,
  blob: () => Promise.resolve(new Blob(['%PDF-1.4'], { type: 'application/pdf' })),
});

describe('BoletoPreviewDialog', () => {
  it('draws the boleto it fetched', async () => {
    stubFetch(pdf());

    renderWithTheme(<BoletoPreviewDialog open charge={charge()} onClose={vi.fn()} />);

    const frame = await screen.findByTitle('Pré-visualização do boleto');
    expect(frame).toHaveAttribute('src', 'blob:mock/1');
  });

  // The bank serves the file as an attachment, so the frame has to be pointed at bytes already
  // fetched rather than at the bank's URL, which would download instead of drawing.
  it('never points the frame at the bank URL directly', async () => {
    stubFetch(pdf());

    renderWithTheme(<BoletoPreviewDialog open charge={charge()} onClose={vi.fn()} />);

    const frame = await screen.findByTitle('Pré-visualização do boleto');
    expect(frame).not.toHaveAttribute('src', BOLETO_URL);
  });

  it('names the payer the boleto is registered against', async () => {
    stubFetch(pdf());

    renderWithTheme(<BoletoPreviewDialog open charge={charge()} onClose={vi.fn()} />);

    expect(await screen.findByText('Maria Silva')).toBeInTheDocument();
  });

  it('downloads the same file it drew, without fetching it twice', async () => {
    const fetchMock = vi.fn().mockResolvedValue(pdf() as Response);
    vi.stubGlobal('fetch', fetchMock);
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    renderWithTheme(<BoletoPreviewDialog open charge={charge()} onClose={vi.fn()} />);

    const download = await screen.findByRole('button', { name: 'Baixar PDF' });
    await waitFor(() => expect(download).toBeEnabled());
    await user.click(download);

    expect(click).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('cannot download while there is nothing fetched yet', () => {
    stubFetch(pdf());

    renderWithTheme(<BoletoPreviewDialog open charge={charge()} onClose={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Baixar PDF' })).toBeDisabled();
  });

  describe('when the file cannot be fetched', () => {
    it('says so instead of showing an empty frame', async () => {
      stubFetch({ ok: false, status: 403 });

      renderWithTheme(<BoletoPreviewDialog open charge={charge()} onClose={vi.fn()} />);

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Não foi possível carregar o boleto.',
      );
      expect(screen.queryByTitle('Pré-visualização do boleto')).not.toBeInTheDocument();
    });

    // The file is still reachable in a tab, so the secretary is not left without the boleto.
    it('still offers the bank URL', async () => {
      stubFetch({ ok: false, status: 403 });

      renderWithTheme(<BoletoPreviewDialog open charge={charge()} onClose={vi.fn()} />);

      const link = await screen.findByRole('link', { name: 'Abrir no navegador' });
      expect(link).toHaveAttribute('href', BOLETO_URL);
    });

    it('lets the fetch be retried', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 500 } as Response)
        .mockResolvedValueOnce(pdf() as Response);
      vi.stubGlobal('fetch', fetchMock);

      renderWithTheme(<BoletoPreviewDialog open charge={charge()} onClose={vi.fn()} />);

      await user.click(await screen.findByRole('button', { name: 'Tentar de novo' }));

      expect(await screen.findByTitle('Pré-visualização do boleto')).toBeInTheDocument();
    });
  });

  // A secretary opens one boleto after another; each holds a whole PDF in memory until released.
  it('releases the file when it closes', async () => {
    stubFetch(pdf());

    const { rerender } = renderWithTheme(
      <BoletoPreviewDialog open charge={charge()} onClose={vi.fn()} />,
    );

    await screen.findByTitle('Pré-visualização do boleto');

    rerender(<BoletoPreviewDialog open={false} charge={charge()} onClose={vi.fn()} />);

    await waitFor(() => expect(revoked).toEqual(['blob:mock/1']));
  });

  it('fetches nothing until it is opened', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    renderWithTheme(<BoletoPreviewDialog open={false} charge={charge()} onClose={vi.fn()} />);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  // The guardian's Inter boleto has no public URL: the API relays it behind the bearer token, so
  // the dialog is handed a loader instead of a bank link.
  describe('with a loader supplied by the caller', () => {
    const file = () => new Blob(['%PDF-1.4'], { type: 'application/pdf' });
    const apiError = (status: number, code: string) =>
      new ApiError(status, code, 'mensagem da API', {});

    it('draws the loaded file without touching the network itself', async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      const loadBlob = vi.fn().mockResolvedValue(file());

      renderWithTheme(
        <BoletoPreviewDialog
          open
          charge={charge({ boleto_url: null })}
          onClose={vi.fn()}
          loadBlob={loadBlob}
        />,
      );

      expect(await screen.findByTitle('Pré-visualização do boleto')).toHaveAttribute(
        'src',
        'blob:mock/1',
      );
      expect(loadBlob).toHaveBeenCalledTimes(1);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('downloads the file it drew without loading it a second time', async () => {
      const loadBlob = vi.fn().mockResolvedValue(file());
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      renderWithTheme(
        <BoletoPreviewDialog
          open
          charge={charge({ boleto_url: null })}
          onClose={vi.fn()}
          loadBlob={loadBlob}
        />,
      );

      const download = await screen.findByRole('button', { name: 'Baixar PDF' });
      await waitFor(() => expect(download).toBeEnabled());
      await user.click(download);

      expect(click).toHaveBeenCalledTimes(1);
      expect(loadBlob).toHaveBeenCalledTimes(1);
    });

    // Each load is one bank call with nothing cached, so a parent re-rendering with a new closure
    // must not buy another PDF.
    it('does not load again when the parent re-renders with a new loader', async () => {
      const first = vi.fn().mockResolvedValue(file());
      const second = vi.fn().mockResolvedValue(file());
      const props = { open: true, charge: charge({ boleto_url: null }), onClose: vi.fn() };

      const { rerender } = renderWithTheme(<BoletoPreviewDialog {...props} loadBlob={first} />);
      await screen.findByTitle('Pré-visualização do boleto');

      rerender(<BoletoPreviewDialog {...props} loadBlob={second} />);

      expect(first).toHaveBeenCalledTimes(1);
      expect(second).not.toHaveBeenCalled();
      expect(screen.getByTitle('Pré-visualização do boleto')).toBeInTheDocument();
    });

    it('says the boleto is unavailable on a 409 and does not offer to retry', async () => {
      const loadBlob = vi.fn().mockRejectedValue(apiError(409, 'boleto_pdf_unavailable'));

      renderWithTheme(
        <BoletoPreviewDialog
          open
          charge={charge({ boleto_url: null })}
          onClose={vi.fn()}
          loadBlob={loadBlob}
        />,
      );

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Este boleto não está disponível para visualização agora.',
      );
      expect(screen.queryByRole('button', { name: 'Tentar de novo' })).not.toBeInTheDocument();
      expect(screen.queryByTitle('Pré-visualização do boleto')).not.toBeInTheDocument();
      expect(loadBlob).toHaveBeenCalledTimes(1);
    });

    it('reports a bank rejection on a 502 without retrying by itself or offering to', async () => {
      const loadBlob = vi.fn().mockRejectedValue(apiError(502, 'boleto_pdf_provider_error'));

      renderWithTheme(
        <BoletoPreviewDialog
          open
          charge={charge({ boleto_url: null })}
          onClose={vi.fn()}
          loadBlob={loadBlob}
        />,
      );

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'O banco não conseguiu entregar o boleto.',
      );
      expect(screen.queryByRole('button', { name: 'Tentar de novo' })).not.toBeInTheDocument();
      expect(loadBlob).toHaveBeenCalledTimes(1);
    });

    it('offers a retry on a 503 and shows the boleto once the bank is back', async () => {
      const loadBlob = vi
        .fn()
        .mockRejectedValueOnce(apiError(503, 'boleto_pdf_provider_unavailable'))
        .mockResolvedValueOnce(file());

      renderWithTheme(
        <BoletoPreviewDialog
          open
          charge={charge({ boleto_url: null })}
          onClose={vi.fn()}
          loadBlob={loadBlob}
        />,
      );

      expect(await screen.findByRole('alert')).toHaveTextContent('O banco está indisponível');
      await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));

      expect(await screen.findByTitle('Pré-visualização do boleto')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(loadBlob).toHaveBeenCalledTimes(2);
    });

    it('falls back to the generic message on any other failure, with a retry', async () => {
      const loadBlob = vi.fn().mockRejectedValue(apiError(404, 'not_found'));

      renderWithTheme(
        <BoletoPreviewDialog
          open
          charge={charge({ boleto_url: null })}
          onClose={vi.fn()}
          loadBlob={loadBlob}
        />,
      );

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Não foi possível carregar o boleto.',
      );
      expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
    });

    it('never links out to the bank, which has no URL to give', async () => {
      const loadBlob = vi.fn().mockRejectedValue(apiError(503, 'boleto_pdf_provider_unavailable'));

      renderWithTheme(
        <BoletoPreviewDialog
          open
          charge={charge({ boleto_url: BOLETO_URL })}
          onClose={vi.fn()}
          loadBlob={loadBlob}
        />,
      );

      await screen.findByRole('alert');
      expect(screen.queryByRole('link', { name: 'Abrir no navegador' })).not.toBeInTheDocument();
    });

    it('releases the file when it closes', async () => {
      const loadBlob = vi.fn().mockResolvedValue(file());
      const props = { charge: charge({ boleto_url: null }), onClose: vi.fn(), loadBlob };

      const { rerender } = renderWithTheme(<BoletoPreviewDialog open {...props} />);
      await screen.findByTitle('Pré-visualização do boleto');

      rerender(<BoletoPreviewDialog open={false} {...props} />);

      await waitFor(() => expect(revoked).toEqual(['blob:mock/1']));
    });

    it('drops a file that arrives after the dialog was closed', async () => {
      let resolve: (blob: Blob) => void = () => {};
      const loadBlob = vi.fn().mockReturnValue(
        new Promise<Blob>((done) => {
          resolve = done;
        }),
      );
      const props = { charge: charge({ boleto_url: null }), onClose: vi.fn(), loadBlob };

      const { rerender } = renderWithTheme(<BoletoPreviewDialog open {...props} />);
      rerender(<BoletoPreviewDialog open={false} {...props} />);
      await act(async () => {
        resolve(file());
      });

      expect(loadBlob).toHaveBeenCalledTimes(1);
      expect(objectUrls).toHaveLength(0);
    });
  });
});
