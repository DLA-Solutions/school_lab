import { useCallback, useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ErrorBanner } from 'design-system';
import IconifyIcon from 'components/base/IconifyIcon';
import { useTranslation } from 'providers/I18nContext';
import { ApiError } from 'services/api';
import downloadBlob from 'utils/downloadBlob';
import type { Charge } from 'types/charge';
import type { MessageKey } from 'locales';

interface BoletoPreviewDialogProps {
  open: boolean;
  charge: Charge | null;
  onClose: () => void;
  /**
   * Supplies the PDF instead of fetching `charge.boleto_url` from the bank — for a boleto that has
   * no public URL and is relayed by the API behind the bearer token (Banco Inter, guardian side).
   * Called once per open (and on retry), so it must not be wrapped in anything that re-fires it.
   * A rejection with an `ApiError` is mapped to a specific message by its `code`.
   */
  loadBlob?: () => Promise<Blob>;
}

/** Why a relayed PDF failed, and whether trying again can help. */
const describeFailure = (
  err: unknown,
): { messageKey: MessageKey; retryable: boolean } => {
  switch (err instanceof ApiError ? err.code : null) {
    // Paid/cancelled, not registered yet or no PDF: asking again changes nothing.
    case 'boleto_pdf_unavailable':
      return { messageKey: 'charges.boleto.unavailable', retryable: false };
    // The bank refused or answered with something that is not a PDF: not the client's to retry.
    case 'boleto_pdf_provider_error':
      return { messageKey: 'charges.boleto.providerError', retryable: false };
    // A bank timeout or outage is transient.
    case 'boleto_pdf_provider_unavailable':
      return { messageKey: 'charges.boleto.providerUnavailable', retryable: true };
    default:
      return { messageKey: 'charges.boleto.error', retryable: true };
  }
};

/**
 * The boleto itself, read without leaving the listing.
 *
 * The file is fetched and shown through an object URL rather than pointed at directly: the bank
 * serves it as `Content-Disposition: attachment`, so a frame aimed at the original URL downloads
 * the file instead of drawing it. Bytes already in hand carry no such header, and the same blob
 * then answers both the preview and the download button without fetching twice.
 *
 * A failure here is not fatal — the bank's own URL still opens in a tab — so the error state
 * offers that rather than leaving the secretary with nothing.
 *
 * With `loadBlob` the file comes from the caller instead — the guardian's Inter boleto, which only
 * the API can fetch. The preview, download and release behaviour is the same; the error state then
 * speaks to the API's reasons and withholds "try again" where it cannot help.
 */
const BoletoPreviewDialog = ({ open, charge, onClose, loadBlob }: BoletoPreviewDialogProps) => {
  const { t } = useTranslation();

  const [fileUrl, setFileUrl] = useState('');
  const [blob, setBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retryable, setRetryable] = useState(true);

  // The loader is read through a ref so a caller passing a fresh closure on every render cannot
  // re-fire it: each run costs a bank request on the guardian side.
  const loadBlobRef = useRef(loadBlob);
  // Bumped on close and on every new load, so a response that lands late is dropped, not shown.
  const attempt = useRef(0);

  useEffect(() => {
    loadBlobRef.current = loadBlob;
  }, [loadBlob]);

  const relayed = loadBlob !== undefined;
  const boletoUrl = charge?.boleto_url ?? null;
  // Names the file after the charge it settles, so a folder of these stays legible.
  const filename = charge ? `boleto-${charge.id}.pdf` : 'boleto.pdf';

  const load = useCallback(async () => {
    const loader = loadBlobRef.current;

    if (!loader && !boletoUrl) {
      return;
    }

    attempt.current += 1;
    const current = attempt.current;

    setLoading(true);
    setError('');
    setRetryable(true);

    try {
      let file: Blob;

      if (loader) {
        file = await loader();
      } else {
        const response = await fetch(boletoUrl as string);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        file = await response.blob();
      }

      if (current !== attempt.current) {
        return;
      }

      setBlob(file);
      setFileUrl(URL.createObjectURL(file));
    } catch (err) {
      if (current !== attempt.current) {
        return;
      }

      const failure = describeFailure(err);
      setError(t(failure.messageKey));
      setRetryable(failure.retryable);
    } finally {
      if (current === attempt.current) {
        setLoading(false);
      }
    }
  }, [boletoUrl, t]);

  useEffect(() => {
    if (!open) {
      return;
    }

    load();
  }, [open, load]);

  // The object URL holds the whole file in memory until it is revoked, and a secretary opens one
  // boleto after another. Revoking as the dialog closes keeps that to a single file at a time.
  useEffect(() => {
    if (open) {
      return;
    }

    attempt.current += 1;

    if (!fileUrl) {
      return;
    }

    URL.revokeObjectURL(fileUrl);
    setFileUrl('');
    setBlob(null);
    setError('');
  }, [open, fileUrl]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {t('charges.boleto.title')}
        {charge && (
          <Typography variant="body2" color="text.secondary">
            {charge.guardian.name}
          </Typography>
        )}
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <ErrorBanner
            message={error}
            onRetry={retryable ? load : undefined}
            retryLabel={t('common.tryAgain')}
          />
        )}

        {loading && (
          <Stack alignItems="center" py={6}>
            <CircularProgress size={28} />
          </Stack>
        )}

        {!loading && fileUrl && (
          <Box
            component="iframe"
            title={t('charges.boleto.frame')}
            src={fileUrl}
            sx={{
              width: 1,
              height: 620,
              border: 0,
              // A boleto is a printed sheet; it is drawn for white in either scheme.
              bgcolor: 'common.white',
              borderRadius: 1,
            }}
          />
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit">
          {t('common.close')}
        </Button>
        {/* The fetch can fail where the file itself is reachable — an offline moment, a proxy in
            the way. The bank's own URL still works then, so the way out stays on screen. */}
        {error && boletoUrl && !relayed && (
          <Button component="a" href={boletoUrl} target="_blank" rel="noopener">
            {t('charges.boleto.openInTab')}
          </Button>
        )}
        <Button
          variant="contained"
          onClick={() => blob && downloadBlob(blob, filename)}
          disabled={!blob}
          startIcon={<IconifyIcon icon="mingcute:download-2-line" />}
        >
          {t('charges.boleto.download')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BoletoPreviewDialog;
