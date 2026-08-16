import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
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
import { Contract } from 'types/contract';
import ContractPreviewDialog from './ContractPreviewDialog';

const user = userEvent.setup({ delay: null });

const CONTRACT_ID = 328;
const CONTRACTS_PATH = `/api/v1/schools/${SCHOOL_ID}/billing/contracts`;
const SIGNED_PATH = `${CONTRACTS_PATH}/${CONTRACT_ID}/signed_document`;
const PREVIEW_PATH = `${CONTRACTS_PATH}/${CONTRACT_ID}/preview`;

const contract = (overrides: Partial<Contract> = {}): Contract =>
  ({
    id: CONTRACT_ID,
    school_id: SCHOOL_ID,
    student_id: 12,
    student_name: 'Mariana Sales',
    signature_status: 'signed',
    signed_document_url: 'https://api.autentique.com.br/documentos/abc/assinado.pdf',
    sent_to_provider: true,
    signed_at: '2026-08-14T12:00:00Z',
    sent_at: '2026-08-14T10:00:00Z',
    due_day: 5,
    ...overrides,
  }) as Contract;

const stubSignedFile = () =>
  server.use(
    http.get(apiUrl(SIGNED_PATH), () =>
      HttpResponse.arrayBuffer(new TextEncoder().encode('%PDF-1.4').buffer, {
        headers: { 'Content-Type': 'application/pdf' },
      }),
    ),
  );

const stubHtmlPreview = () =>
  server.use(
    http.get(apiUrl(PREVIEW_PATH), () =>
      HttpResponse.json({ data: { html: '<p>texto enviado</p>', filename: 'contrato.pdf' } }),
    ),
  );

beforeEach(() => {
  setAccessToken(FRESH_ACCESS_TOKEN, ACCESS_EXPIRES_AT);
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock/1');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

const renderDialog = (over: Partial<Contract> = {}, open = true) =>
  renderWithTheme(
    <ContractPreviewDialog
      open={open}
      schoolId={SCHOOL_ID}
      contract={contract(over)}
      onClose={vi.fn()}
    />,
  );

describe('ContractPreviewDialog, once the contract is signed', () => {
  it('shows the provider file, which is the copy that proves anything', async () => {
    stubSignedFile();
    stubHtmlPreview();

    renderDialog();

    const frame = await screen.findByTitle('Contrato assinado');
    expect(frame).toHaveAttribute('src', 'blob:mock/1');
  });

  it('offers the signed file as a download', async () => {
    stubSignedFile();
    stubHtmlPreview();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    renderDialog();

    const download = await screen.findByRole('button', { name: 'Baixar PDF assinado' });
    await user.click(download);

    expect(click).toHaveBeenCalledTimes(1);
  });

  // The provider's URL answers only to the school's API token, so it is fetched through the API.
  // Pointing the frame at the provider directly is what returned 403.
  it('never points the frame at the provider URL', async () => {
    stubSignedFile();
    stubHtmlPreview();

    renderDialog();

    const frame = await screen.findByTitle('Contrato assinado');
    expect(frame).not.toHaveAttribute(
      'src',
      'https://api.autentique.com.br/documentos/abc/assinado.pdf',
    );
  });

  // Our own render is what the family was sent; it is still worth reading when the provider's
  // file cannot be fetched, rather than leaving the dialog empty.
  it('falls back to the text that was sent when the file cannot be fetched', async () => {
    server.use(http.get(apiUrl(SIGNED_PATH), () => HttpResponse.error()));
    stubHtmlPreview();

    renderDialog();

    expect(await screen.findByTitle('Contrato')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Baixar PDF assinado' })).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText(/não foi possível obter o PDF da Autentique/i)).toBeInTheDocument(),
    );
  });

  // Signed, but the provider file has not been reconciled onto the record yet — minutes, not an
  // error, and a different thing from a contract nobody signed.
  it('reads the sent text when no provider file is on record yet', async () => {
    stubHtmlPreview();

    renderDialog({ signed_document_url: null });

    expect(await screen.findByTitle('Contrato')).toBeInTheDocument();
    expect(screen.getByText(/ainda não foi localizado/i)).toBeInTheDocument();
  });

  it('releases the file when it closes', async () => {
    stubSignedFile();
    stubHtmlPreview();

    const { rerender } = renderDialog();
    await screen.findByTitle('Contrato assinado');

    rerender(
      <ContractPreviewDialog
        open={false}
        schoolId={SCHOOL_ID}
        contract={contract()}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock/1'));
  });
});

describe('ContractPreviewDialog, before it is signed', () => {
  it('reads our render of the agreement and offers no signed download', async () => {
    stubHtmlPreview();

    renderDialog({ signature_status: 'pending_signature', signed_document_url: null });

    expect(await screen.findByTitle('Contrato')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Baixar PDF assinado' })).not.toBeInTheDocument();
  });
});
