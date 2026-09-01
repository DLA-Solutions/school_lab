import { useCallback, useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ErrorBanner, SuccessBanner } from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { ApiError } from 'services/api';
import { StudentHealthRecord, getHealthRecord, saveHealthRecord } from 'services/healthRecordsApi';

const MAX_LENGTH = 5000;

export interface HealthRecordDialogProps {
  open: boolean;
  schoolId: number;
  studentId: number;
  studentName: string;
  /** Reaches the sheet through the guardian portal rather than the school's register. */
  asGuardian?: boolean;
  onClose: () => void;
  onSaved?: (record: StudentHealthRecord) => void;
}

/**
 * A child's health sheet, read and written from one place.
 *
 * The same dialog serves both sides: a family fills it in from the portal, and the school reads it
 * from the register — and writes down what a parent said at the counter. Whoever wrote it last is
 * shown alongside, because a note nobody can attribute is one nobody acts on.
 */
const HealthRecordDialog = ({
  open,
  schoolId,
  studentId,
  studentName,
  asGuardian = false,
  onClose,
  onSaved,
}: HealthRecordDialogProps) => {
  const { t, locale } = useTranslation();

  const [record, setRecord] = useState<StudentHealthRecord | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setSaved(false);

    try {
      const data = await getHealthRecord(schoolId, studentId, { asGuardian });
      setRecord(data);
      setContent(data.content);
    } catch (err) {
      setRecord(null);
      setError(err instanceof ApiError ? err.message : t('health.loadError'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, studentId, asGuardian, t]);

  useEffect(() => {
    if (!open) {
      return;
    }

    load();
  }, [open, load]);

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      const data = await saveHealthRecord(schoolId, studentId, content, { asGuardian });
      setRecord(data);
      setContent(data.content);
      setSaved(true);
      onSaved?.(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('health.saveError'));
    } finally {
      setSaving(false);
    }
  };

  // Nothing to save until the text differs from what is already on the sheet.
  const dirty = record !== null && content !== record.content;
  const tooLong = content.length > MAX_LENGTH;

  const writtenBy =
    record?.content_updated_at && record.updated_by_name
      ? t('health.lastWrittenBy', {
          name: record.updated_by_name,
          date: new Date(record.content_updated_at).toLocaleDateString(locale),
        })
      : t('health.neverFilled');

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {t('health.title')}
        <Typography variant="body2" color="text.secondary">
          {studentName}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        <Stack direction="column" gap={2}>
          {error && (
            <ErrorBanner message={error} onRetry={load} retryLabel={t('common.tryAgain')} />
          )}

          {saved && <SuccessBanner message={t('health.saved')} />}

          <Typography variant="body2" color="text.secondary">
            {t('health.description')}
          </Typography>

          {loading ? (
            <Stack alignItems="center" py={6}>
              <CircularProgress size={28} />
            </Stack>
          ) : (
            <>
              <TextField
                id="health-record-content"
                label={t('health.field')}
                value={content}
                onChange={(event) => {
                  setContent(event.target.value);
                  setSaved(false);
                }}
                multiline
                minRows={8}
                fullWidth
                disabled={saving || record === null}
                error={tooLong}
                helperText={
                  tooLong
                    ? t('health.tooLong', { limit: String(MAX_LENGTH) })
                    : `${content.length}/${MAX_LENGTH}`
                }
              />

              <Typography variant="caption" color="text.secondary">
                {writtenBy}
              </Typography>
            </>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit" disabled={saving}>
          {t('common.close')}
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || loading || !dirty || tooLong}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {saving ? t('common.saving') : t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default HealthRecordDialog;
