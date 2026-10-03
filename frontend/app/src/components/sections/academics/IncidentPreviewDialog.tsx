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
import { ApiError } from 'services/api';
import { fetchIncidentPdf } from 'services/incidentsApi';
import { Incident } from 'types/incidents';

export interface IncidentPreviewDialogProps {
  open: boolean;
  schoolId: number;
  incident: Incident | null;
  onClose: () => void;
}

/**
 * The "Ata" exactly as a guardian would be shown it (`Academic::RenderIncidentPdfService`) — so a
 * teacher or coordinator reading it back is never looking at different bytes than the family.
 * Mirrors `ContractPreviewDialog`'s PDF branch: fetched as a blob through the API (never a bare
 * `<a href>`, which would need the bearer token the browser does not carry) and rendered in a
 * sandboxed iframe so the document's own markup never reaches the app's styles or session.
 */
const IncidentPreviewDialog = ({ open, schoolId, incident, onClose }: IncidentPreviewDialogProps) => {
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!incident) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const file = await fetchIncidentPdf(schoolId, incident.id);
      setUrl(URL.createObjectURL(file));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('atas.previewError'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, incident, t]);

  useEffect(() => {
    if (!open) {
      return;
    }

    load();
  }, [open, load]);

  // The object URL holds the whole file in memory until it is revoked — releasing it as the
  // dialog closes keeps that to one document at a time.
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
        {t('atas.previewTitle')}
        {incident && (
          <Typography variant="body2" color="text.secondary">
            {incident.student_name}
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
              title={t('atas.previewFrame')}
              src={url}
              sandbox=""
              sx={{
                width: 1,
                height: 520,
                border: 0,
                // The document is a printed page; a white sheet is what it is designed against,
                // in either scheme.
                bgcolor: 'common.white',
                borderRadius: 1,
              }}
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

export default IncidentPreviewDialog;
