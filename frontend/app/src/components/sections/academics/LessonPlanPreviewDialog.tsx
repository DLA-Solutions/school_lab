import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { fetchLessonPlanPdf } from 'services/lessonPlansApi';
import { LessonPlan } from 'types/lessonPlans';

export interface LessonPlanPreviewDialogProps {
  open: boolean;
  schoolId: number;
  lessonPlan: LessonPlan | null;
  /** Resolved by the caller — `LessonPlan` only carries `subject_id`, not a subject name. */
  subjectName?: string;
  onClose: () => void;
}

/**
 * UC-LP05/BR-LP08 — the BR-LP07 template fields rendered as a PDF
 * (`Academic::RenderLessonPlanPdfService`), previewed the same way as the Ata/incident PDF
 * (`IncidentPreviewDialog`): fetched as an authenticated blob through the API (never a bare
 * `<a href>`, which would need the bearer token the browser does not carry) and rendered in an
 * iframe pointed at that blob URL. No `sandbox` attribute — sandboxing would force the iframe
 * into an opaque origin that conflicts with the blob URL's inherited app origin, which is what
 * blocked the Ata preview from rendering in Chrome before that was fixed.
 */
const LessonPlanPreviewDialog = ({
  open,
  schoolId,
  lessonPlan,
  subjectName,
  onClose,
}: LessonPlanPreviewDialogProps) => {
  const { t, locale } = useTranslation();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!lessonPlan) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const file = await fetchLessonPlanPdf(schoolId, lessonPlan.id);
      setUrl(URL.createObjectURL(file));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('lessonPlans.previewError'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, lessonPlan, t]);

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

  const formattedDate = useMemo(() => {
    if (!lessonPlan) {
      return '';
    }

    const parsed = new Date(`${lessonPlan.date}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return lessonPlan.date;
    }

    return parsed.toLocaleDateString(locale === 'en-US' ? 'en-US' : 'pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }, [lessonPlan, locale]);

  const subtitle = [subjectName, formattedDate].filter(Boolean).join(' — ');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {t('lessonPlans.previewTitle')}
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
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
              title={t('lessonPlans.previewFrame')}
              src={url}
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

export default LessonPlanPreviewDialog;
