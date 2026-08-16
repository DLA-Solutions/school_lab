import { useCallback, useEffect, useState } from 'react';
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
import downloadBlob from 'utils/downloadBlob';
import type { Charge } from 'types/charge';

interface BoletoPreviewDialogProps {
  open: boolean;
  charge: Charge | null;
  onClose: () => void;
}

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
 */
const BoletoPreviewDialog = ({ open, charge, onClose }: BoletoPreviewDialogProps) => {
  const { t } = useTranslation();

  const [fileUrl, setFileUrl] = useState('');
  const [blob, setBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const boletoUrl = charge?.boleto_url ?? null;
  // Names the file after the charge it settles, so a folder of these stays legible.
  const filename = charge ? `boleto-${charge.id}.pdf` : 'boleto.pdf';

  const load = useCallback(async () => {
    if (!boletoUrl) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(boletoUrl);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const file = await response.blob();
      setBlob(file);
      setFileUrl(URL.createObjectURL(file));
    } catch {
      setError(t('charges.boleto.error'));
    } finally {
      setLoading(false);
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
    if (open || !fileUrl) {
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
        {error && <ErrorBanner message={error} onRetry={load} retryLabel={t('common.tryAgain')} />}

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
        {error && boletoUrl && (
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
