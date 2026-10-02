import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
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
import PreceptorshipFormDialog from 'components/sections/academics/PreceptorshipFormDialog';
import { useTranslation } from 'providers/I18nContext';
import { useCurrentSchool } from 'providers/useCurrentSchool';
import { ApiError } from 'services/api';
import { deleteReport, fetchReportPdf, fetchRoll, listReports, publishReport } from 'services/preceptorshipApi';
import { PreceptorshipReport, RollStudent } from 'types/preceptorshipReport';
import { previewBlob, revokeBlobUrls } from 'utils/previewBlob';

interface RosterRow {
  student: RollStudent;
  report: PreceptorshipReport | null;
}

/**
 * Preceptoria as a teacher works it: a roster of the students they may write about, each row
 * showing who the family is and, once a report exists, a way to look at it or carry on writing.
 *
 * Starting a report happens through "Nova preceptoria" rather than an always-open form — most of
 * a teacher's visits here are to check or edit something that already exists, not to start from
 * blank.
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

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<PreceptorshipReport | null>(null);
  const [initialStudentId, setInitialStudentId] = useState<number | null>(null);

  const [publishing, setPublishing] = useState<PreceptorshipReport | null>(null);
  const [previewingId, setPreviewingId] = useState<number | null>(null);

  // Preview tabs open against object URLs that only this component created — nobody else will
  // revoke them, so they are tracked here and released when the page is left.
  const previewUrls = useRef<string[]>([]);
  useEffect(() => () => revokeBlobUrls(previewUrls.current), []);

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

  const loadRoll = useCallback(async () => {
    if (!schoolId) {
      return;
    }

    try {
      const response = await fetchRoll(schoolId);
      setRoll(response.data);
    } catch {
      setRoll([]);
    }
  }, [schoolId]);

  useEffect(() => {
    loadRoll();
  }, [loadRoll]);

  // One row per student in the roll, not per existing report — a student with nothing written
  // yet is still something a teacher needs to see, so they know who is left.
  const roster: RosterRow[] = useMemo(
    () =>
      roll.map((student) => ({
        student,
        report: reports.find((report) => report.student_id === student.id) ?? null,
      })),
    [roll, reports],
  );

  const openNewReport = (studentId: number | null = null) => {
    setEditingReport(null);
    setInitialStudentId(studentId);
    setDialogOpen(true);
  };

  const openEditReport = (report: PreceptorshipReport) => {
    setEditingReport(report);
    setInitialStudentId(null);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingReport(null);
    setInitialStudentId(null);
  };

  const handleSaved = async () => {
    setNotice(t('preceptorship.saved'));
    closeDialog();
    await load();
  };

  const confirmPublish = async () => {
    if (!schoolId || !publishing) {
      return;
    }

    setError('');

    try {
      await publishReport(schoolId, publishing.id);
      setNotice(t('preceptorship.published'));
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
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('preceptorship.deleteError'));
    }
  };

  const preview = async (report: PreceptorshipReport) => {
    if (!schoolId) {
      return;
    }

    setError('');
    setPreviewingId(report.id);

    try {
      const blob = await fetchReportPdf(schoolId, report.id, 'teacher');
      previewUrls.current.push(previewBlob(blob));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('preceptorship.pdfError'));
    } finally {
      setPreviewingId(null);
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
      <PageHeader
        title={t('nav.preceptorship')}
        actions={
          <Button variant="contained" onClick={() => openNewReport()}>
            {t('preceptorship.new')}
          </Button>
        }
      />

      {error && <ErrorBanner message={error} />}
      {notice && <SuccessBanner message={notice} />}

      <SectionCard>
        <Typography variant="subtitle1" component="h2" gutterBottom>
          {t('preceptorship.roster.title')}
        </Typography>

        {!loading && roster.length === 0 ? (
          <EmptyState
            title={t('preceptorship.roster.empty.title')}
            description={t('preceptorship.roster.empty.description')}
            headingLevel={3}
          />
        ) : (
          <Stack direction="column" divider={<Divider />}>
            {roster.map(({ student, report }) => {
              const guardianNames = student.guardian_names ?? [];

              return (
                <Stack key={student.id} direction="column" gap={1} py={2}>
                  <Stack direction="row" gap={1.5} alignItems="center" flexWrap="wrap">
                    <Typography variant="subtitle2">
                      {student.school_class_name
                        ? `${student.name} — ${student.school_class_name}`
                        : student.name}
                    </Typography>
                    {report && (
                      <SemanticChip
                        variant={report.status === 'published' ? 'success' : 'info'}
                        label={t(`preceptorship.status.${report.status}`)}
                      />
                    )}
                  </Stack>

                  <Typography variant="body2" color="text.secondary">
                    {t('preceptorship.roster.guardians')}:{' '}
                    {guardianNames.length > 0
                      ? guardianNames.join(', ')
                      : t('preceptorship.roster.noGuardians')}
                  </Typography>

                  <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
                    {report ? (
                      <>
                        <Button
                          size="small"
                          onClick={() => preview(report)}
                          disabled={previewingId === report.id}
                        >
                          {t('preceptorship.action.preview')}
                        </Button>
                        {report.editable && (
                          <>
                            <Button size="small" onClick={() => openEditReport(report)}>
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
                      </>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        {t('preceptorship.roster.noReport')}
                      </Typography>
                    )}
                  </Stack>
                </Stack>
              );
            })}
          </Stack>
        )}
      </SectionCard>

      <PreceptorshipFormDialog
        open={dialogOpen}
        schoolId={schoolId as number}
        roll={roll}
        report={editingReport}
        initialStudentId={initialStudentId}
        onClose={closeDialog}
        onSaved={handleSaved}
      />

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
