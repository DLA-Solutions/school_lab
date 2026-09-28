import { FormEvent, useCallback, useEffect, useState } from 'react';
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
import IconifyIcon from 'components/base/IconifyIcon';
import { useTranslation } from 'providers/I18nContext';
import { ApiError } from 'services/api';
import {
  StudentHealthRecord,
  createHealthRecord,
  getHealthRecord,
  healthRecordDocumentUrl,
  updateHealthRecord,
} from 'services/healthRecordsApi';

const MAX_TITLE_LENGTH = 120;
const MAX_CONTENT_LENGTH = 5000;
const MAX_PDF_BYTES = 10 * 1024 * 1024;

export interface HealthRecordDialogProps {
  open: boolean;
  schoolId: number;
  studentId: number;
  recordId: number | null;
  initialRecord?: StudentHealthRecord | null;
  asGuardian?: boolean;
  readOnly?: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const HealthRecordDialog = ({
  open,
  schoolId,
  studentId,
  recordId,
  initialRecord = null,
  asGuardian = false,
  readOnly = false,
  onClose,
  onSaved,
}: HealthRecordDialogProps) => {
  const { t, locale } = useTranslation();
  const isCreate = recordId === null;

  const [record, setRecord] = useState<StudentHealthRecord | null>(initialRecord);
  const [title, setTitle] = useState(initialRecord?.title ?? '');
  const [content, setContent] = useState(initialRecord?.content ?? '');
  const [document, setDocument] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    if (isCreate || !recordId) {
      setRecord(null);
      setTitle('');
      setContent('');
      setDocument(null);
      return;
    }

    if (initialRecord && initialRecord.id === recordId) {
      setRecord(initialRecord);
      setTitle(initialRecord.title);
      setContent(initialRecord.content);
      setDocument(null);
      return;
    }

    setLoading(true);
    setError('');
    setSaved(false);

    try {
      const data = await getHealthRecord(schoolId, studentId, recordId, { asGuardian });
      setRecord(data);
      setTitle(data.title);
      setContent(data.content);
      setDocument(null);
    } catch (err) {
      setRecord(null);
      setError(err instanceof ApiError ? err.message : t('health.records.loadError'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, studentId, recordId, isCreate, initialRecord, asGuardian, t]);

  useEffect(() => {
    if (!open) {
      return;
    }

    load();
  }, [open, load]);

  const titleTooLong = title.length > MAX_TITLE_LENGTH;
  const contentTooLong = content.length > MAX_CONTENT_LENGTH;
  const documentTooLarge = document !== null && document.size > MAX_PDF_BYTES;
  const documentNotPdf =
    document !== null &&
    document.type !== 'application/pdf' &&
    !document.name.toLowerCase().endsWith('.pdf');

  const dirty =
    isCreate ||
    (record !== null &&
      (title !== record.title || content !== record.content || document !== null));

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();

    if (readOnly || !asGuardian || !title.trim()) {
      if (!title.trim()) {
        setError(t('health.records.titleRequired'));
      }
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = { title: title.trim(), content, document };
      if (isCreate) {
        await createHealthRecord(schoolId, studentId, payload);
      } else if (recordId) {
        await updateHealthRecord(schoolId, studentId, recordId, payload);
      }

      setSaved(true);
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('health.records.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const writtenBy =
    record?.content_updated_at && record.updated_by_name
      ? t('health.lastWrittenBy', {
          name: record.updated_by_name,
          date: new Date(record.content_updated_at).toLocaleDateString(locale),
        })
      : null;

  const dialogTitle = isCreate
    ? t('health.records.add')
    : readOnly
      ? record?.title ?? t('health.records.view')
      : t('health.records.edit');

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{dialogTitle}</DialogTitle>
      <DialogContent dividers>
        <Stack
          component="form"
          id="health-record-form"
          onSubmit={handleSave}
          direction="column"
          gap={2}
          noValidate
        >
          {error && (
            <ErrorBanner
              message={error}
              onRetry={isCreate ? undefined : load}
              retryLabel={t('common.tryAgain')}
            />
          )}
          {saved && <SuccessBanner message={t('health.records.saved')} />}
          {loading ? (
            <Stack alignItems="center" py={6}>
              <CircularProgress size={28} />
            </Stack>
          ) : (
            <>
              <TextField
                id="health-record-title"
                label={t('health.records.fieldTitle')}
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  setSaved(false);
                }}
                fullWidth
                required
                disabled={readOnly || saving}
                error={titleTooLong}
                helperText={
                  titleTooLong
                    ? t('health.records.titleTooLong', { limit: String(MAX_TITLE_LENGTH) })
                    : `${title.length}/${MAX_TITLE_LENGTH}`
                }
              />
              <TextField
                id="health-record-content"
                label={t('health.field')}
                value={content}
                onChange={(event) => {
                  setContent(event.target.value);
                  setSaved(false);
                }}
                multiline
                minRows={6}
                fullWidth
                disabled={readOnly || saving}
                error={contentTooLong}
                helperText={
                  contentTooLong
                    ? t('health.tooLong', { limit: String(MAX_CONTENT_LENGTH) })
                    : `${content.length}/${MAX_CONTENT_LENGTH}`
                }
              />
              {!readOnly && asGuardian && (
                <Button
                  component="label"
                  variant="outlined"
                  disabled={saving}
                  startIcon={<IconifyIcon icon="mingcute:file-line" />}
                >
                  {document ? document.name : t('health.records.chooseDocument')}
                  <input
                    hidden
                    type="file"
                    accept="application/pdf"
                    aria-label={t('health.records.chooseDocument')}
                    onChange={(event) => {
                      setDocument(event.target.files?.[0] ?? null);
                      setSaved(false);
                    }}
                  />
                </Button>
              )}
              {documentNotPdf && (
                <Typography variant="caption" color="error">
                  {t('health.records.documentNotPdf')}
                </Typography>
              )}
              {documentTooLarge && (
                <Typography variant="caption" color="error">
                  {t('health.records.documentTooLarge')}
                </Typography>
              )}
              {record?.has_document && record.document_url && (
                <Button
                  size="small"
                  component="a"
                  href={healthRecordDocumentUrl(record) ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ alignSelf: 'flex-start' }}
                >
                  {record.document_filename ?? t('health.records.viewDocument')}
                </Button>
              )}
              {writtenBy && (
                <Typography variant="caption" color="text.secondary">
                  {writtenBy}
                </Typography>
              )}
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit" disabled={saving}>
          {t('common.close')}
        </Button>
        {!readOnly && asGuardian && (
          <Button
            type="submit"
            form="health-record-form"
            variant="contained"
            disabled={
              saving ||
              loading ||
              !dirty ||
              titleTooLong ||
              contentTooLong ||
              documentTooLarge ||
              documentNotPdf ||
              !title.trim()
            }
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default HealthRecordDialog;
