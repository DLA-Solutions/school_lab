import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { DataTable, EmptyState, ErrorBanner, PageHeader, SectionCard } from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { useGuardianSchool } from 'providers/useGuardianSchool';
import { ApiError } from 'services/api';
import { fetchReportPdf, listMyReports } from 'services/preceptorshipApi';
import { PreceptorshipReport } from 'types/preceptorshipReport';
import { downloadBlob } from 'utils/downloadBlob';

const PAGE_SIZE = 25;

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
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!schoolId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await listMyReports(schoolId, page + 1);
      setReports(response.data);
      setTotal(response.meta.total);
    } catch (err) {
      setReports([]);
      setTotal(0);
      setError(err instanceof ApiError ? err.message : t('myPreceptorship.loadError'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, page, t]);

  useEffect(() => {
    load();
  }, [load]);

  const download = useCallback(
    async (report: PreceptorshipReport) => {
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
    },
    [schoolId, t],
  );

  const columns = useMemo<GridColDef<PreceptorshipReport>[]>(
    () => [
      {
        field: 'student_name',
        headerName: t('common.student'),
        flex: 1,
        minWidth: 160,
        renderCell: ({ row }: GridRenderCellParams<PreceptorshipReport>) => (
          <Typography variant="subtitle2">{row.student_name}</Typography>
        ),
      },
      {
        field: 'teacher_name',
        headerName: t('lessons.teacher'),
        flex: 1,
        minWidth: 180,
        sortable: false,
        renderCell: ({ row }: GridRenderCellParams<PreceptorshipReport>) => (
          <Typography variant="caption" color="text.secondary">
            {t('myPreceptorship.by', { teacher: row.teacher_name ?? '' })}
          </Typography>
        ),
      },
      {
        field: 'published_at',
        headerName: t('preceptorship.status.published'),
        width: 140,
        renderCell: ({ row }: GridRenderCellParams<PreceptorshipReport>) => (
          <Typography variant="caption" color="text.secondary">
            {row.published_at
              ? new Date(row.published_at).toLocaleDateString()
              : t('common.none')}
          </Typography>
        ),
      },
      {
        field: 'body',
        headerName: t('preceptorship.form.body'),
        flex: 2,
        minWidth: 280,
        sortable: false,
        renderCell: ({ row }: GridRenderCellParams<PreceptorshipReport>) => (
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', py: 1.5, width: 1 }}>
            {row.body}
          </Typography>
        ),
      },
      {
        field: 'actions',
        headerName: t('common.actions'),
        width: 140,
        sortable: false,
        filterable: false,
        renderCell: ({ row }: GridRenderCellParams<PreceptorshipReport>) => (
          <Button size="small" onClick={() => download(row)}>
            {t('myPreceptorship.download')}
          </Button>
        ),
      },
    ],
    [download, t],
  );

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

      <SectionCard title={t('myPreceptorship.listSection.title')} padding={0}>
        {!loading && reports.length === 0 && !error ? (
          <EmptyState
            title={t('myPreceptorship.empty.title')}
            description={t('myPreceptorship.empty.description')}
            headingLevel={3}
          />
        ) : (
          <Box px={3.5} py={3.5} sx={{ height: 594, width: 1 }}>
            <DataTable
              rows={reports}
              columns={columns}
              loading={loading}
              disableRowSelectionOnClick
              getRowHeight={() => 'auto'}
              paginationMode="server"
              rowCount={total}
              pageSizeOptions={[PAGE_SIZE]}
              paginationModel={{ page, pageSize: PAGE_SIZE }}
              onPaginationModelChange={(model) => setPage(model.page)}
              rangeLabel={({ from, to, count }) => t('common.range', { from, to, count })}
              // With no rows yet the grid's default overlay is a skeleton. A spinner is what
              // this screen showed while the first page was still on its way.
              slotProps={{
                loadingOverlay: {
                  variant: 'circular-progress',
                  noRowsVariant: 'circular-progress',
                },
              }}
              sx={{
                '& .MuiDataGrid-cell': {
                  whiteSpace: 'normal',
                  lineHeight: 'normal',
                },
              }}
            />
          </Box>
        )}
      </SectionCard>
    </Stack>
  );
};

export default MyPreceptorship;
