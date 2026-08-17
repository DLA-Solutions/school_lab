import { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { EmptyState, ErrorBanner, PageHeader, SectionCard } from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { useGuardianSchool } from 'providers/useGuardianSchool';
import { ApiError } from 'services/api';
import {
  fetchMyReportCardPdf,
  getMyReportCard,
  listMyReportCards,
} from 'services/reportCardsApi';
import { listMyStudents } from 'services/studentsApi';
import { MyReportCardListItem, ReportCardPublication } from 'types/reportCard';
import { Student } from 'types/student';
import { downloadBlob } from 'utils/downloadBlob';

/**
 * Boletins as a guardian reads them: released snapshots per child and period, with metadata and
 * a stored PDF download — never a recalculation on the client.
 */
const MyReportCards = () => {
  const { t, locale } = useTranslation();
  const school = useGuardianSchool();
  const schoolId = school?.school_id ?? null;

  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState('');

  const [rows, setRows] = useState<MyReportCardListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [detail, setDetail] = useState<ReportCardPublication | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [downloading, setDownloading] = useState(false);

  const studentName = (id: number) => students.find((student) => student.id === id)?.name ?? `#${id}`;

  const formatReleasedAt = (iso: string | null) => {
    if (!iso) {
      return '—';
    }

    return new Date(iso).toLocaleDateString(locale === 'en-US' ? 'en-US' : 'pt-BR');
  };

  const load = useCallback(async () => {
    if (!schoolId) {
      return;
    }

    setLoading(true);
    setError('');

    const studentFilter = studentId ? Number(studentId) : undefined;

    try {
      const response = await listMyReportCards({ schoolId, studentId: studentFilter });
      setRows(response.data);
    } catch (err) {
      setRows([]);
      setError(err instanceof ApiError ? err.message : t('myReportCards.loadError'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, studentId, t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!schoolId) {
      return;
    }

    const loadStudents = async () => {
      try {
        const response = await listMyStudents(schoolId);
        setStudents(response.data);
      } catch {
        setStudents([]);
      }
    };

    loadStudents();
  }, [schoolId]);

  const openDetail = async (row: MyReportCardListItem) => {
    if (!schoolId) {
      return;
    }

    setDetail(null);
    setDetailLoading(true);
    setDetailError('');

    try {
      setDetail(await getMyReportCard(schoolId, row.publication_id));
    } catch (err) {
      setDetailError(err instanceof ApiError ? err.message : t('myReportCards.detailError'));
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetail(null);
    setDetailError('');
  };

  const downloadPdf = async (row: MyReportCardListItem) => {
    if (!schoolId || !row.snapshot_id) {
      return;
    }

    setDownloading(true);
    setError('');

    try {
      const blob = await fetchMyReportCardPdf(schoolId, row.publication_id, row.snapshot_id);
      downloadBlob(blob, `boletim-${row.student_id}-p${row.academic_period_id}.pdf`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('myReportCards.pdfError'));
    } finally {
      setDownloading(false);
    }
  };

  if (!school) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title={t('nav.myReportCards')} />
        <SectionCard>
          <EmptyState
            title={t('common.noAccess.title')}
            description={t('myReportCards.noAccess.description')}
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader title={t('nav.myReportCards')} />

      {error && <ErrorBanner message={error} onRetry={load} retryLabel={t('common.tryAgain')} />}

      <SectionCard>
        {students.length > 1 && (
          <Box mb={2}>
            <TextField
              id="my-report-cards-child"
              label={t('myReportCards.child')}
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
              variant="filled"
              size="small"
              select
              sx={{ minWidth: 220 }}
            >
              <MenuItem value="">{t('myReportCards.allChildren')}</MenuItem>
              {students.map((student) => (
                <MenuItem key={student.id} value={String(student.id)}>
                  {student.name}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        )}

        {loading ? (
          <Stack alignItems="center" py={6}>
            <CircularProgress />
          </Stack>
        ) : rows.length === 0 ? (
          <EmptyState
            title={t('myReportCards.empty.title')}
            description={t('myReportCards.empty.description')}
            headingLevel={3}
          />
        ) : (
          <Stack direction="column" divider={<Divider />}>
            {rows.map((row) => (
              <Stack
                key={row.publication_id}
                direction="row"
                gap={1.5}
                alignItems="center"
                flexWrap="wrap"
                py={2}
              >
                <Typography variant="subtitle2">{studentName(row.student_id)}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('myReportCards.period', { periodId: String(row.academic_period_id) })}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('myReportCards.releasedAt', { date: formatReleasedAt(row.released_at) })}
                </Typography>
                {row.version !== null && (
                  <Typography variant="body2" color="text.secondary">
                    {t('myReportCards.version', { version: String(row.version) })}
                  </Typography>
                )}
                <Button size="small" variant="outlined" onClick={() => openDetail(row)}>
                  {t('myReportCards.viewDetail')}
                </Button>
                <Button
                  size="small"
                  onClick={() => downloadPdf(row)}
                  disabled={downloading || !row.snapshot_id}
                >
                  {t('myReportCards.downloadPdf')}
                </Button>
              </Stack>
            ))}
          </Stack>
        )}
      </SectionCard>

      <Dialog open={detail !== null || detailLoading} onClose={closeDetail} maxWidth="sm" fullWidth>
        <DialogTitle>{t('myReportCards.detail.title')}</DialogTitle>
        <DialogContent dividers>
          {detailError && (
            <ErrorBanner
              message={detailError}
              onRetry={() => detail && openDetail({ publication_id: detail.id } as MyReportCardListItem)}
              retryLabel={t('common.tryAgain')}
            />
          )}

          {detailLoading && (
            <Stack alignItems="center" py={4}>
              <CircularProgress size={28} />
            </Stack>
          )}

          {detail && !detailLoading && detail.active_snapshot && (
            <Stack direction="column" gap={1.5}>
              <Typography variant="body2" color="text.secondary">
                {t('myReportCards.detail.student', { name: studentName(detail.student_id) })}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('myReportCards.detail.period', {
                  periodId: String(detail.academic_period_id),
                })}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('myReportCards.detail.releasedAt', {
                  date: formatReleasedAt(detail.active_snapshot.released_at),
                })}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('myReportCards.detail.configVersion', {
                  version: String(detail.active_snapshot.config_version),
                })}
              </Typography>
              {detail.active_snapshot.correction_reason && (
                <Typography variant="body2" color="text.secondary">
                  {t('myReportCards.detail.correction', {
                    reason: detail.active_snapshot.correction_reason,
                  })}
                </Typography>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDetail} variant="contained">
            {t('common.close')}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default MyReportCards;
