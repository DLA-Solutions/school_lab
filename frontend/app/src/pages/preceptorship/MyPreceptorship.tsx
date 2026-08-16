import { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { EmptyState, ErrorBanner, PageHeader, SectionCard } from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { useGuardianSchool } from 'providers/useGuardianSchool';
import { ApiError } from 'services/api';
import { fetchReportPdf, listMyReports } from 'services/preceptorshipApi';
import { PreceptorshipReport } from 'types/preceptorshipReport';
import { downloadBlob } from 'utils/downloadBlob';

/**
 * Preceptoria as a family reads it: what the school has published about their children.
 *
 * The prose is on the page rather than behind a download. A parent should be able to read what
 * the teacher wrote without first saving a file; the PDF is for keeping and forwarding, which is
 * a different need and a separate button.
 */
const MyPreceptorship = () => {
  const { t } = useTranslation();
  const school = useGuardianSchool();
  const schoolId = school?.school_id ?? null;

  const [reports, setReports] = useState<PreceptorshipReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!schoolId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await listMyReports(schoolId);
      setReports(response.data);
    } catch (err) {
      setReports([]);
      setError(err instanceof ApiError ? err.message : t('myPreceptorship.loadError'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, t]);

  useEffect(() => {
    load();
  }, [load]);

  const download = async (report: PreceptorshipReport) => {
    if (!schoolId) {
      return;
    }

    setError('');

    try {
      const blob = await fetchReportPdf(schoolId, report.id, 'family');
      downloadBlob(blob, `preceptoria-${report.student_name ?? report.student_id}.pdf`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('myPreceptorship.pdfError'));
    }
  };

  if (!school) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title={t('nav.myPreceptorship')} />
        <SectionCard>
          <EmptyState
            title={t('common.noAccess.title')}
            description={t('myPreceptorship.noAccess.description')}
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader title={t('nav.myPreceptorship')} />

      {error && <ErrorBanner message={error} />}

      <SectionCard>
        {!loading && reports.length === 0 ? (
          <EmptyState
            title={t('myPreceptorship.empty.title')}
            description={t('myPreceptorship.empty.description')}
            headingLevel={2}
          />
        ) : (
          <Stack direction="column" divider={<Divider />}>
            {reports.map((report) => (
              <Stack key={report.id} direction="column" gap={1} py={2}>
                <Stack direction="row" gap={1.5} alignItems="center" flexWrap="wrap">
                  <Typography variant="subtitle2">{report.student_name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t('myPreceptorship.by', { teacher: report.teacher_name ?? '' })}
                    {report.published_at
                      ? ` · ${new Date(report.published_at).toLocaleDateString()}`
                      : ''}
                  </Typography>
                </Stack>

                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {report.body}
                </Typography>

                <Box>
                  <Button size="small" onClick={() => download(report)}>
                    {t('myPreceptorship.download')}
                  </Button>
                </Box>
              </Stack>
            ))}
          </Stack>
        )}
      </SectionCard>
    </Stack>
  );
};

export default MyPreceptorship;
