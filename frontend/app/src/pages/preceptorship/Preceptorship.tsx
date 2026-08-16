import { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  PageHeader,
  SectionCard,
  SemanticChip,
  SuccessBanner,
} from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { useCurrentSchool } from 'providers/useCurrentSchool';
import { ApiError } from 'services/api';
import {
  createReport,
  deleteReport,
  fetchReportPdf,
  fetchRoll,
  listReports,
  publishReport,
  updateReport,
} from 'services/preceptorshipApi';
import { PreceptorshipReport, RollStudent } from 'types/preceptorshipReport';
import { downloadBlob } from 'utils/downloadBlob';

/**
 * Preceptoria as a teacher works it: what they have written about their students, and what they
 * are still writing.
 *
 * The draft is the whole point of the screen. A teacher works on a paragraph about somebody's
 * child over several sittings, so the writing box saves as a draft and publishing is a separate,
 * deliberate act — with a confirmation, because there is no way back.
 */
const Preceptorship = () => {
  const { t } = useTranslation();
  const school = useCurrentSchool();
  const schoolId = school?.school_id ?? null;

  const [roll, setRoll] = useState<RollStudent[]>([]);
  const [reports, setReports] = useState<PreceptorshipReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [studentId, setStudentId] = useState('');
  const [body, setBody] = useState('');
  // The draft being worked on, if any. Writing into an existing draft rather than starting a
  // second one is what keeps a student from collecting three half-written reports.
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState<PreceptorshipReport | null>(null);

  const load = useCallback(async () => {
    if (!schoolId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await listReports(schoolId);
      setReports(response.data);
    } catch (err) {
      setReports([]);
      setError(err instanceof ApiError ? err.message : t('preceptorship.loadError'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!schoolId) {
      return;
    }

    const loadRoll = async () => {
      try {
        const response = await fetchRoll(schoolId);
        setRoll(response.data);
      } catch {
        setRoll([]);
      }
    };

    loadRoll();
  }, [schoolId]);

  const resetForm = () => {
    setEditingId(null);
    setStudentId('');
    setBody('');
  };

  const save = async () => {
    if (!schoolId || !body.trim() || (!editingId && !studentId)) {
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');

    try {
      if (editingId) {
        await updateReport(schoolId, editingId, { body: body.trim() });
      } else {
        await createReport(schoolId, { student_id: Number(studentId), body: body.trim() });
      }
      setNotice(t('preceptorship.saved'));
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('preceptorship.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const edit = (report: PreceptorshipReport) => {
    setEditingId(report.id);
    setStudentId(String(report.student_id));
    setBody(report.body);
  };

  const confirmPublish = async () => {
    if (!schoolId || !publishing) {
      return;
    }

    setError('');

    try {
      await publishReport(schoolId, publishing.id);
      setNotice(t('preceptorship.published'));
      if (editingId === publishing.id) {
        resetForm();
      }
      setPublishing(null);
      await load();
    } catch (err) {
      setPublishing(null);
      setError(err instanceof ApiError ? err.message : t('preceptorship.publishError'));
    }
  };

  const discard = async (report: PreceptorshipReport) => {
    if (!schoolId) {
      return;
    }

    setError('');

    try {
      await deleteReport(schoolId, report.id);
      if (editingId === report.id) {
        resetForm();
      }
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('preceptorship.deleteError'));
    }
  };

  const download = async (report: PreceptorshipReport) => {
    if (!schoolId) {
      return;
    }

    setError('');

    try {
      const blob = await fetchReportPdf(schoolId, report.id, 'teacher');
      downloadBlob(blob, `preceptoria-${report.student_name ?? report.student_id}.pdf`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('preceptorship.pdfError'));
    }
  };

  if (!school) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title={t('nav.preceptorship')} />
        <SectionCard>
          <EmptyState
            title={t('common.noAccess.title')}
            description={t('preceptorship.noAccess.description')}
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader title={t('nav.preceptorship')} />

      {error && <ErrorBanner message={error} />}
      {notice && <SuccessBanner message={notice} />}

      <SectionCard>
        <Typography variant="subtitle1" component="h2" gutterBottom>
          {editingId ? t('preceptorship.form.editTitle') : t('preceptorship.form.newTitle')}
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2.5}>
          {t('preceptorship.form.description')}
        </Typography>

        <Stack direction="column" gap={2}>
          <TextField
            id="preceptorship-student"
            label={t('common.student')}
            value={studentId}
            onChange={(event) => setStudentId(event.target.value)}
            // Which child a report is about is settled when it is started. Letting it be moved
            // afterwards would turn a correction into a report about the wrong student.
            disabled={Boolean(editingId)}
            variant="filled"
            size="small"
            select
            required
            sx={{ minWidth: 320 }}
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

          <Stack direction="row" gap={1}>
            <Button
              variant="contained"
              onClick={save}
              disabled={saving || !body.trim() || (!editingId && !studentId)}
            >
              {t('preceptorship.form.save')}
            </Button>
            {editingId && <Button onClick={resetForm}>{t('common.cancel')}</Button>}
          </Stack>
        </Stack>
      </SectionCard>

      <SectionCard>
        <Typography variant="subtitle1" component="h2" gutterBottom>
          {t('preceptorship.list.title')}
        </Typography>

        {!loading && reports.length === 0 ? (
          <EmptyState
            title={t('preceptorship.empty.title')}
            description={t('preceptorship.empty.description')}
            headingLevel={3}
          />
        ) : (
          <Stack direction="column" divider={<Divider />}>
            {reports.map((report) => (
              <Stack key={report.id} direction="column" gap={1} py={2}>
                <Stack direction="row" gap={1.5} alignItems="center" flexWrap="wrap">
                  <Typography variant="subtitle2">{report.student_name}</Typography>
                  <SemanticChip
                    variant={report.status === 'published' ? 'success' : 'info'}
                    label={t(`preceptorship.status.${report.status}`)}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {new Date(report.published_at ?? report.created_at).toLocaleDateString()}
                  </Typography>
                </Stack>

                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {report.body}
                </Typography>

                <Box>
                  <Stack direction="row" gap={1} flexWrap="wrap">
                    {report.editable && (
                      <>
                        <Button size="small" onClick={() => edit(report)}>
                          {t('preceptorship.action.edit')}
                        </Button>
                        <Button size="small" onClick={() => setPublishing(report)}>
                          {t('preceptorship.action.publish')}
                        </Button>
                        <Button size="small" color="error" onClick={() => discard(report)}>
                          {t('preceptorship.action.discard')}
                        </Button>
                      </>
                    )}
                    <Button size="small" onClick={() => download(report)}>
                      {t('preceptorship.action.pdf')}
                    </Button>
                  </Stack>
                </Box>
              </Stack>
            ))}
          </Stack>
        )}
      </SectionCard>

      {/* Publishing cannot be undone, so it is asked about rather than done on a single click. */}
      <ConfirmDialog
        open={Boolean(publishing)}
        title={t('preceptorship.confirmPublish.title')}
        message={t('preceptorship.confirmPublish.description', {
          student: publishing?.student_name ?? '',
        })}
        confirmLabel={t('preceptorship.action.publish')}
        cancelLabel={t('common.cancel')}
        onConfirm={confirmPublish}
        onCancel={() => setPublishing(null)}
      />
    </Stack>
  );
};

export default Preceptorship;
