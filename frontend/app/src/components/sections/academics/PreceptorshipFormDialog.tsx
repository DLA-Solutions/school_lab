import { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ErrorBanner } from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { ApiError } from 'services/api';
import { createReport, updateReport } from 'services/preceptorshipApi';
import { PreceptorshipReport, RollStudent } from 'types/preceptorshipReport';

export interface PreceptorshipFormDialogProps {
  open: boolean;
  schoolId: number;
  roll: RollStudent[];
  /** Present to carry on an existing draft; absent to start a new report. */
  report?: PreceptorshipReport | null;
  /** Pre-selects a student when starting a new report from their roster row. */
  initialStudentId?: number | null;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Where a teacher writes about one student — reused for both starting a report and carrying on
 * an existing draft, so there is exactly one place this text is composed.
 */
const PreceptorshipFormDialog = ({
  open,
  schoolId,
  roll,
  report,
  initialStudentId,
  onClose,
  onSaved,
}: PreceptorshipFormDialogProps) => {
  const { t } = useTranslation();
  const [studentId, setStudentId] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      return;
    }

    setError('');
    if (report) {
      setStudentId(String(report.student_id));
      setBody(report.body);
    } else {
      setStudentId(initialStudentId ? String(initialStudentId) : '');
      setBody('');
    }
  }, [open, report, initialStudentId]);

  const save = async () => {
    if (!body.trim() || (!report && !studentId)) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      if (report) {
        await updateReport(schoolId, report.id, { body: body.trim() });
      } else {
        await createReport(schoolId, { student_id: Number(studentId), body: body.trim() });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('preceptorship.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {report ? t('preceptorship.form.editTitle') : t('preceptorship.form.newTitle')}
      </DialogTitle>
      <DialogContent>
        <Stack direction="column" gap={2} pt={1}>
          <Typography variant="body2" color="text.secondary">
            {t('preceptorship.form.description')}
          </Typography>

          {error && <ErrorBanner message={error} />}

          <TextField
            id="preceptorship-student"
            label={t('common.student')}
            value={studentId}
            onChange={(event) => setStudentId(event.target.value)}
            // Which child a report is about is settled when it is started. Letting it be moved
            // afterwards would turn a correction into a report about the wrong student.
            disabled={Boolean(report)}
            variant="filled"
            size="small"
            select
            required
            fullWidth
          >
            {roll.map((student) => (
              <MenuItem key={student.id} value={String(student.id)}>
                {student.school_class_name
                  ? `${student.name} — ${student.school_class_name}`
                  : student.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            id="preceptorship-body"
            label={t('preceptorship.form.body')}
            helperText={t('preceptorship.form.bodyHelp')}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            variant="filled"
            size="small"
            multiline
            minRows={6}
            required
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={save}
          disabled={saving || !body.trim() || (!report && !studentId)}
          startIcon={saving ? <CircularProgress size={16} /> : undefined}
        >
          {t('preceptorship.form.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PreceptorshipFormDialog;
