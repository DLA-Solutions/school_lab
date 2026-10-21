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
import { useTranslation } from 'providers/I18nContext';
import { fetchMinutesEntryPdf } from 'services/minutesApi';
import { minutesErrorMessage } from 'utils/api/minutesErrors';

export interface MinutesPdfPreviewDialogProps {
  open: boolean;
  schoolId: number;
  entryId: number | null;
  title?: string;
  onClose: () => void;
}

/**
 * The ata as `GET .../minutes_entries/:id/pdf` serves it — the signed copy once signed, a fresh
 * render before. Same blob-URL iframe as the incident "Ata" preview: fetched through the API (the
 * bearer token cannot ride an `<a href>`) and revoked when the dialog closes.
 */
const MinutesPdfPreviewDialog = ({
  open,
  schoolId,
  entryId,
  title,
  onClose,
}: MinutesPdfPreviewDialogProps) => {
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (entryId === null) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const file = await fetchMinutesEntryPdf(schoolId, entryId);
      setUrl(URL.createObjectURL(file));
    } catch (err) {
      setError(minutesErrorMessage(err, t, 'minutes.preview.error'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, entryId, t]);

  useEffect(() => {
    if (open) {
      load();
    }
  }, [open, load]);

  useEffect(() => {
    if (open || !url) {
      return;
    }

    URL.revokeObjectURL(url);
    setUrl('');
  }, [open, url]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {t('minutes.preview.title')}
        {title && (
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent dividers>
        {error && <ErrorBanner message={error} />}

        {loading ? (
          <Stack alignItems="center" py={6}>
            <CircularProgress size={28} />
          </Stack>
        ) : (
          url && (
            <Box
              component="iframe"
              title={t('minutes.preview.frame')}
              src={url}
              sx={{ width: 1, height: 520, border: 0, bgcolor: 'common.white', borderRadius: 1 }}
            />
          )
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          {t('common.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MinutesPdfPreviewDialog;
