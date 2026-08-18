import { useCallback, useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { EmptyState, ErrorBanner, SemanticChip } from 'design-system';
import IconifyIcon from 'components/base/IconifyIcon';
import { useTranslation } from 'providers/I18nContext';
import { ApiError } from 'services/api';
import { listReports } from 'services/preceptorshipApi';
import { fetchStudentReportCardPdf, listStudentReportCards } from 'services/reportCardsApi';
import {
  AcademicPeriod,
  SchoolYear,
  listAcademicPeriods,
  listSchoolYears,
} from 'services/schoolYearsApi';
import { MyReportCardListItem } from 'types/reportCard';
import { PreceptorshipReport } from 'types/preceptorshipReport';
import downloadBlob from 'utils/downloadBlob';

type TabKey = 'reportCards' | 'preceptorship';

export interface StudentAcademicDialogProps {
  open: boolean;
  schoolId: number;
  studentId: number;
  studentName: string;
  onClose: () => void;
}

/**
 * How one child is getting on: the boletins the school published, and what their teachers wrote
 * about them.
 *
 * Two readings of the same question, so they sit behind one button rather than two — and both are
 * filtered by the same year and term, because a register spanning several years otherwise opens on
 * a wall of everything the child ever had. The selects sit above the tabs for that reason: the
 * period being asked about does not change when the reading of it does.
 *
 * Only published preceptorship is shown. A draft is a teacher still thinking, and the school
 * reading it over their shoulder is not what the drafting step is for.
 */
const StudentAcademicDialog = ({
  open,
  schoolId,
  studentId,
  studentName,
  onClose,
}: StudentAcademicDialogProps) => {
  const { t, locale } = useTranslation();

  const [tab, setTab] = useState<TabKey>('reportCards');

  const [years, setYears] = useState<SchoolYear[]>([]);
  const [yearId, setYearId] = useState('');
  const [periods, setPeriods] = useState<AcademicPeriod[]>([]);
  const [periodId, setPeriodId] = useState('');

  const [cards, setCards] = useState<MyReportCardListItem[]>([]);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [cardsError, setCardsError] = useState('');
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const [reports, setReports] = useState<PreceptorshipReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState('');

  // The years drive the term select, so they are loaded once the dialog opens and the most recent
  // one is chosen — that is the year somebody asking about a child almost always means.
  useEffect(() => {
    if (!open) {
      return;
    }

    const loadYears = async () => {
      try {
        const data = await listSchoolYears(schoolId);
        setYears(data);
        setYearId(data.length > 0 ? String(data[0].id) : '');
      } catch {
        // The boletim listing below reports its own failures; an empty year select is signal
        // enough here, and it still lists every boletim unfiltered.
        setYears([]);
      }
    };

    loadYears();
  }, [open, schoolId]);

  useEffect(() => {
    if (!yearId) {
      setPeriods([]);
      setPeriodId('');
      return;
    }

    const loadPeriods = async () => {
      try {
        setPeriods(await listAcademicPeriods(schoolId, Number(yearId)));
      } catch {
        setPeriods([]);
      }
      setPeriodId('');
    };

    loadPeriods();
  }, [schoolId, yearId]);

  const loadCards = useCallback(async () => {
    if (!open) {
      return;
    }

    setCardsLoading(true);
    setCardsError('');

    try {
      const response = await listStudentReportCards({
        schoolId,
        studentId,
        academicPeriodId: periodId ? Number(periodId) : undefined,
        schoolYearId: !periodId && yearId ? Number(yearId) : undefined,
      });
      setCards(response.data);
    } catch (err) {
      setCards([]);
      setCardsError(err instanceof ApiError ? err.message : t('academic.reportCards.loadError'));
    } finally {
      setCardsLoading(false);
    }
  }, [open, schoolId, studentId, yearId, periodId, t]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const loadReports = useCallback(async () => {
    if (!open) {
      return;
    }

    setReportsLoading(true);
    setReportsError('');

    try {
      const response = await listReports(schoolId, {
        student_id: studentId,
        academic_period_id: periodId ? Number(periodId) : undefined,
        school_year_id: !periodId && yearId ? Number(yearId) : undefined,
      });
      // A draft is a teacher still thinking; the family has not seen it and neither should this.
      setReports(response.data.filter((report) => report.status === 'published'));
    } catch (err) {
      setReports([]);
      setReportsError(
        err instanceof ApiError ? err.message : t('academic.preceptorship.loadError'),
      );
    } finally {
      setReportsLoading(false);
    }
  }, [open, schoolId, studentId, yearId, periodId, t]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleDownload = async (card: MyReportCardListItem) => {
    if (!card.snapshot_id) {
      return;
    }

    setDownloadingId(card.publication_id);
    setCardsError('');

    try {
      const file = await fetchStudentReportCardPdf(schoolId, card.publication_id, card.snapshot_id);
      downloadBlob(
        file,
        `boletim-${studentName.toLowerCase().replace(/\s+/g, '-')}-${card.publication_id}.pdf`,
      );
    } catch (err) {
      setCardsError(err instanceof ApiError ? err.message : t('academic.reportCards.pdfError'));
    } finally {
      setDownloadingId(null);
    }
  };

  const formatDate = (value: string | null) =>
    value ? new Date(value).toLocaleDateString(locale) : null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {t('academic.title')}
        <Typography variant="body2" color="text.secondary">
          {studentName}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        <Stack direction="column" gap={2.5}>
          <Tabs value={tab} onChange={(_event, value: TabKey) => setTab(value)}>
            <Tab value="reportCards" label={t('academic.tab.reportCards')} />
            <Tab value="preceptorship" label={t('academic.tab.preceptorship')} />
          </Tabs>

          {/* One year and one term for both readings — the period being asked about does not
              change when the tab does. */}
          <Stack direction="row" gap={2} flexWrap="wrap">
            <TextField
              id="academic-year"
              label={t('common.schoolYear')}
              value={yearId}
              onChange={(event) => setYearId(event.target.value)}
              select
              sx={{ minWidth: 160 }}
              disabled={years.length === 0}
            >
              {years.map((year) => (
                <MenuItem key={year.id} value={String(year.id)}>
                  {year.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              id="academic-period"
              label={t('academic.term')}
              value={periodId}
              onChange={(event) => setPeriodId(event.target.value)}
              select
              sx={{ minWidth: 180 }}
              disabled={periods.length === 0}
            >
              {/* Every term of the year, which is what somebody checking a child's progress
                  across the year actually wants. */}
              <MenuItem value="">{t('academic.allTerms')}</MenuItem>
              {periods.map((period) => (
                <MenuItem key={period.id} value={String(period.id)}>
                  {period.name}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          {tab === 'reportCards' ? (
            <>
              {cardsError && (
                <ErrorBanner
                  message={cardsError}
                  onRetry={loadCards}
                  retryLabel={t('common.tryAgain')}
                />
              )}

              {cardsLoading ? (
                <Stack alignItems="center" py={5}>
                  <CircularProgress size={28} />
                </Stack>
              ) : cards.length === 0 ? (
                <EmptyState
                  title={t('academic.reportCards.empty.title')}
                  description={t('academic.reportCards.empty.description')}
                  headingLevel={2}
                />
              ) : (
                <Stack direction="column" gap={1.5}>
                  {cards.map((card) => (
                    <Stack
                      key={card.publication_id}
                      direction="row"
                      gap={1.5}
                      alignItems="center"
                      flexWrap="wrap"
                    >
                      <Typography variant="body2" sx={{ minWidth: 140 }}>
                        {card.academic_period_name ?? t('academic.term')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" flex={1}>
                        {card.released_at
                          ? t('academic.reportCards.released', {
                              date: formatDate(card.released_at) ?? '',
                              version: String(card.version ?? 1),
                            })
                          : t('academic.reportCards.notReleased')}
                      </Typography>
                      <Button
                        size="small"
                        disabled={!card.snapshot_id || downloadingId === card.publication_id}
                        onClick={() => handleDownload(card)}
                        startIcon={
                          downloadingId === card.publication_id ? (
                            <CircularProgress size={14} />
                          ) : (
                            <IconifyIcon icon="mingcute:download-2-line" />
                          )
                        }
                      >
                        {t('academic.reportCards.download')}
                      </Button>
                    </Stack>
                  ))}
                </Stack>
              )}
            </>
          ) : (
            <>
              {reportsError && (
                <ErrorBanner
                  message={reportsError}
                  onRetry={loadReports}
                  retryLabel={t('common.tryAgain')}
                />
              )}

              {reportsLoading ? (
                <Stack alignItems="center" py={5}>
                  <CircularProgress size={28} />
                </Stack>
              ) : reports.length === 0 ? (
                <EmptyState
                  title={t('academic.preceptorship.empty.title')}
                  description={t('academic.preceptorship.empty.description')}
                  headingLevel={2}
                />
              ) : (
                <Stack direction="column" gap={2}>
                  {reports.map((report, index) => (
                    <Stack key={report.id} direction="column" gap={0.75}>
                      {index > 0 && <Divider />}
                      <Stack direction="row" gap={1.5} alignItems="center" flexWrap="wrap">
                        <Typography variant="subtitle2">
                          {report.teacher_name ?? t('common.teacherRole')}
                        </Typography>
                        {report.period_name && (
                          <SemanticChip variant="info" label={report.period_name} />
                        )}
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(report.published_at)}
                        </Typography>
                      </Stack>
                      {/* The teacher's own words, kept as written — line breaks and all. */}
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {report.body}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              )}
            </>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained">
          {t('common.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StudentAcademicDialog;
