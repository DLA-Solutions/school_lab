import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  DataTable,
  EmptyState,
  ErrorBanner,
  PageHeader,
  SectionCard,
  SemanticChip,
  SuccessBanner,
} from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { useGuardianSchool } from 'providers/useGuardianSchool';
import { ApiError } from 'services/api';
import {
  ensureMyTaxDeclaration,
  fetchMyTaxDeclarationPdf,
  getMyTaxDeclarationVersion,
  listMyTaxDeclarations,
} from 'services/taxDeclarationsApi';
import { TaxDeclarationListItem, TaxDeclarationVersion } from 'types/taxDeclaration';
import { downloadBlob } from 'utils/downloadBlob';
import { formatCents } from 'utils/money';

type GenerateState =
  | { kind: 'idle' }
  | { kind: 'ineligible' }
  | { kind: 'configuration_incomplete' }
  | { kind: 'year_not_closed' }
  | { kind: 'generation_in_progress' };

const PAGE_SIZE = 25;

/** Closed Gregorian calendar years the guardian may request (current year is still open). */
const closedCalendarYears = (count = 5) => {
  const currentYear = new Date().getFullYear();

  return Array.from({ length: count }, (_, index) => currentYear - 1 - index);
};

const formatIssuedAt = (iso: string | null, locale: string) => {
  if (!iso) {
    return '—';
  }

  return new Date(iso).toLocaleDateString(locale === 'en-US' ? 'en-US' : 'pt-BR');
};

/**
 * Annual income-tax declarations for the logged-in payer: list generated years, ensure or refresh
 * a closed calendar year, inspect version metadata, and download the stored PDF.
 */
const MyTaxDeclarations = () => {
  const { t, locale } = useTranslation();
  const school = useGuardianSchool();
  const schoolId = school?.school_id ?? null;

  const yearOptions = useMemo(() => closedCalendarYears(), []);
  const [calendarYear, setCalendarYear] = useState(String(yearOptions[0] ?? new Date().getFullYear() - 1));

  const [rows, setRows] = useState<TaxDeclarationListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [generating, setGenerating] = useState(false);
  const [generateState, setGenerateState] = useState<GenerateState>({ kind: 'idle' });

  const [detail, setDetail] = useState<TaxDeclarationVersion | null>(null);
  const [detailYear, setDetailYear] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const selectedYear = Number(calendarYear);
  const existingForYear = rows.find((row) => row.calendar_year === selectedYear);

  const load = useCallback(async () => {
    if (!schoolId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await listMyTaxDeclarations({ schoolId, page: page + 1 });
      setRows(response.data);
      setTotal(response.meta.total);
    } catch (err) {
      setRows([]);
      setTotal(0);
      setError(err instanceof ApiError ? err.message : t('myTaxDeclarations.loadError'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, page, t]);

  useEffect(() => {
    load();
  }, [load]);

  const mapGenerateError = (err: unknown) => {
    if (!(err instanceof ApiError)) {
      setGenerateState({ kind: 'idle' });
      setError(t('myTaxDeclarations.generateError'));
      return;
    }

    switch (err.code) {
      case 'no_eligible_payments':
        setGenerateState({ kind: 'ineligible' });
        break;
      case 'tax_declaration_configuration_incomplete':
        setGenerateState({ kind: 'configuration_incomplete' });
        break;
      case 'calendar_year_not_closed':
        setGenerateState({ kind: 'year_not_closed' });
        break;
      case 'generation_in_progress':
        setGenerateState({ kind: 'generation_in_progress' });
        break;
      default:
        setGenerateState({ kind: 'idle' });
        setError(err.message);
    }
  };

  const handleEnsure = async (year: number) => {
    if (!schoolId) {
      return;
    }

    setGenerating(true);
    setNotice('');
    setError('');
    setGenerateState({ kind: 'idle' });

    try {
      await ensureMyTaxDeclaration(schoolId, year);
      setNotice(
        existingForYear
          ? t('myTaxDeclarations.regenerateSuccess', { year: String(year) })
          : t('myTaxDeclarations.generateSuccess', { year: String(year) }),
      );
      await load();
    } catch (err) {
      mapGenerateError(err);
    } finally {
      setGenerating(false);
    }
  };

  const openDetail = async (row: TaxDeclarationListItem) => {
    if (!schoolId || !row.active_version_id) {
      return;
    }

    setDetail(null);
    setDetailYear(row.calendar_year);
    setDetailLoading(true);
    setDetailError('');

    try {
      setDetail(
        await getMyTaxDeclarationVersion(schoolId, row.tax_declaration_id, row.active_version_id),
      );
    } catch (err) {
      setDetailError(err instanceof ApiError ? err.message : t('myTaxDeclarations.detailError'));
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetail(null);
    setDetailYear(null);
    setDetailError('');
  };

  const downloadPdf = async (row: TaxDeclarationListItem) => {
    if (!schoolId || !row.version) {
      return;
    }

    setDownloadingId(row.tax_declaration_id);
    setError('');

    try {
      const blob = await fetchMyTaxDeclarationPdf(
        schoolId,
        row.tax_declaration_id,
        row.version.id,
      );
      downloadBlob(blob, `declaracao-imposto-renda-${row.calendar_year}.pdf`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('myTaxDeclarations.pdfError'));
    } finally {
      setDownloadingId(null);
    }
  };

  const generatePanel = (
    <Stack direction="row" gap={2} alignItems="flex-end" flexWrap="wrap">
      <TextField
        id="my-tax-declarations-year"
        label={t('myTaxDeclarations.year')}
        value={calendarYear}
        onChange={(event) => setCalendarYear(event.target.value)}
        variant="filled"
        size="small"
        select
        sx={{ minWidth: 160 }}
      >
        {yearOptions.map((year) => (
          <MenuItem key={year} value={String(year)}>
            {year}
          </MenuItem>
        ))}
      </TextField>
      <Button
        variant="contained"
        onClick={() => handleEnsure(selectedYear)}
        disabled={generating || !selectedYear}
      >
        {generating
          ? t('myTaxDeclarations.generating')
          : existingForYear
            ? t('myTaxDeclarations.regenerate')
            : t('myTaxDeclarations.generate')}
      </Button>
    </Stack>
  );

  const generateStatePanel = () => {
    switch (generateState.kind) {
      case 'ineligible':
        return (
          <EmptyState
            title={t('myTaxDeclarations.ineligible.title')}
            description={t('myTaxDeclarations.ineligible.description', {
              year: String(selectedYear),
            })}
            headingLevel={3}
          />
        );
      case 'configuration_incomplete':
        return (
          <EmptyState
            title={t('myTaxDeclarations.configurationIncomplete.title')}
            description={t('myTaxDeclarations.configurationIncomplete.description')}
            headingLevel={3}
          />
        );
      case 'year_not_closed':
        return (
          <EmptyState
            title={t('myTaxDeclarations.yearNotClosed.title')}
            description={t('myTaxDeclarations.yearNotClosed.description', {
              year: String(selectedYear),
            })}
            headingLevel={3}
          />
        );
      case 'generation_in_progress':
        return (
          <EmptyState
            title={t('myTaxDeclarations.generationInProgress.title')}
            description={t('myTaxDeclarations.generationInProgress.description')}
            headingLevel={3}
          />
        );
      default:
        return null;
    }
  };

  if (!school) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title={t('nav.myTaxDeclarations')} />
        <SectionCard>
          <EmptyState
            title={t('common.noAccess.title')}
            description={t('myTaxDeclarations.noAccess.description')}
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  const missingValue = () => (
    <Typography variant="body2" color="text.secondary">
      {t('common.none')}
    </Typography>
  );

  const columns: GridColDef<TaxDeclarationListItem>[] = [
    {
      field: 'calendar_year',
      headerName: t('myTaxDeclarations.year'),
      width: 150,
      sortable: false,
      renderCell: ({ row }: GridRenderCellParams<TaxDeclarationListItem>) => (
        <Typography variant="subtitle2">
          {t('myTaxDeclarations.calendarYear', { year: String(row.calendar_year) })}
        </Typography>
      ),
    },
    {
      field: 'lifecycle',
      headerName: t('common.status'),
      width: 140,
      sortable: false,
      renderCell: ({ row }: GridRenderCellParams<TaxDeclarationListItem>) =>
        row.version ? (
          <SemanticChip
            variant={row.version.lifecycle === 'active' ? 'success' : 'info'}
            label={t(`myTaxDeclarations.lifecycle.${row.version.lifecycle}`)}
          />
        ) : (
          missingValue()
        ),
    },
    {
      field: 'amount',
      headerName: t('common.amount'),
      width: 140,
      sortable: false,
      renderCell: ({ row }: GridRenderCellParams<TaxDeclarationListItem>) =>
        row.version ? (
          <Typography variant="body2">
            {formatCents(row.version.total_declared_principal_amount_cents)}
          </Typography>
        ) : (
          missingValue()
        ),
    },
    {
      field: 'version_number',
      headerName: t('myTaxDeclarations.versionNumber', { number: '' }).trim(),
      width: 120,
      sortable: false,
      renderCell: ({ row }: GridRenderCellParams<TaxDeclarationListItem>) =>
        row.version ? (
          <Typography variant="body2" color="text.secondary">
            {t('myTaxDeclarations.versionNumber', { number: String(row.version.number) })}
          </Typography>
        ) : (
          missingValue()
        ),
    },
    {
      field: 'issued_at',
      headerName: t('myTaxDeclarations.issuedAt', { date: '' }).trim(),
      flex: 1,
      minWidth: 180,
      sortable: false,
      renderCell: ({ row }: GridRenderCellParams<TaxDeclarationListItem>) =>
        row.version ? (
          <Typography variant="body2" color="text.secondary">
            {t('myTaxDeclarations.issuedAt', {
              date: formatIssuedAt(row.version.issued_at, locale),
            })}
          </Typography>
        ) : (
          missingValue()
        ),
    },
    {
      field: 'view_detail',
      headerName: t('myTaxDeclarations.viewDetail'),
      width: 150,
      sortable: false,
      filterable: false,
      renderCell: ({ row }: GridRenderCellParams<TaxDeclarationListItem>) => (
        <Button
          size="small"
          variant="outlined"
          onClick={() => openDetail(row)}
          disabled={!row.active_version_id}
        >
          {t('myTaxDeclarations.viewDetail')}
        </Button>
      ),
    },
    {
      field: 'download_pdf',
      headerName: t('myTaxDeclarations.downloadPdf'),
      width: 140,
      sortable: false,
      filterable: false,
      renderCell: ({ row }: GridRenderCellParams<TaxDeclarationListItem>) => (
        <Button
          size="small"
          onClick={() => downloadPdf(row)}
          disabled={downloadingId === row.tax_declaration_id || !row.version}
        >
          {t('myTaxDeclarations.downloadPdf')}
        </Button>
      ),
    },
    {
      field: 'regenerate',
      headerName: t('myTaxDeclarations.regenerate'),
      width: 210,
      sortable: false,
      filterable: false,
      renderCell: ({ row }: GridRenderCellParams<TaxDeclarationListItem>) => (
        <Button
          size="small"
          variant="text"
          onClick={() => {
            setCalendarYear(String(row.calendar_year));
            void handleEnsure(row.calendar_year);
          }}
          disabled={generating}
        >
          {t('myTaxDeclarations.regenerate')}
        </Button>
      ),
    },
  ];

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader title={t('nav.myTaxDeclarations')} />

      {error && <ErrorBanner message={error} onRetry={load} retryLabel={t('common.tryAgain')} />}
      {notice && <SuccessBanner message={notice} />}

      <SectionCard title={t('myTaxDeclarations.generateSection.title')}>
        <Typography variant="body2" color="text.secondary" mb={2}>
          {t('myTaxDeclarations.generateSection.description')}
        </Typography>
        {generatePanel}
        {generateState.kind !== 'idle' && <Box mt={3}>{generateStatePanel()}</Box>}
      </SectionCard>

      <SectionCard title={t('myTaxDeclarations.listSection.title')} padding={0}>
        {!loading && rows.length === 0 && !error ? (
          <EmptyState
            title={t('myTaxDeclarations.empty.title')}
            description={t('myTaxDeclarations.empty.description')}
            headingLevel={3}
          />
        ) : (
          <Box px={3.5} py={3.5} sx={{ height: 594, width: 1 }}>
            <DataTable
              rows={rows}
              columns={columns}
              loading={loading}
              getRowId={(row) => row.tax_declaration_id}
              disableRowSelectionOnClick
              getRowHeight={() => 'auto'}
              paginationMode="server"
              rowCount={total}
              pageSizeOptions={[PAGE_SIZE]}
              paginationModel={{ page, pageSize: PAGE_SIZE }}
              onPaginationModelChange={(model) => setPage(model.page)}
              rangeLabel={({ from, to, count }) => t('common.range', { from, to, count })}
            />
          </Box>
        )}
      </SectionCard>

      <Dialog open={detail !== null || detailLoading} onClose={closeDetail} maxWidth="sm" fullWidth>
        <DialogTitle>{t('myTaxDeclarations.detail.title')}</DialogTitle>
        <DialogContent dividers>
          {detailError && (
            <ErrorBanner
              message={detailError}
              onRetry={() => {
                const row = rows.find((item) => item.calendar_year === detailYear);
                if (row) {
                  void openDetail(row);
                }
              }}
              retryLabel={t('common.tryAgain')}
            />
          )}

          {detailLoading && (
            <Stack alignItems="center" py={4}>
              <CircularProgress size={28} />
            </Stack>
          )}

          {detail && !detailLoading && (
            <Stack direction="column" gap={1.5}>
              {detailYear !== null && (
                <Typography variant="body2" color="text.secondary">
                  {t('myTaxDeclarations.detail.calendarYear', { year: String(detailYear) })}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                {t('myTaxDeclarations.detail.version', { number: String(detail.number) })}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('myTaxDeclarations.detail.lifecycle', {
                  status: t(`myTaxDeclarations.lifecycle.${detail.lifecycle}`),
                })}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('myTaxDeclarations.detail.issuedAt', {
                  date: formatIssuedAt(detail.issued_at, locale),
                })}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('myTaxDeclarations.detail.total', {
                  amount: formatCents(detail.total_declared_principal_amount_cents),
                })}
              </Typography>
              {detail.supersedes_version_id !== null && (
                <Typography variant="body2" color="text.secondary">
                  {t('myTaxDeclarations.detail.supersedes', {
                    versionId: String(detail.supersedes_version_id),
                  })}
                </Typography>
              )}

              {detail.students.length > 0 && (
                <>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2">{t('myTaxDeclarations.detail.students')}</Typography>
                  {detail.students.map((student) => (
                    <Typography key={student.student_id} variant="body2" color="text.secondary">
                      {t('myTaxDeclarations.detail.studentLine', {
                        name: student.student_name,
                        amount: formatCents(student.declared_principal_amount_cents),
                      })}
                    </Typography>
                  ))}
                </>
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

export default MyTaxDeclarations;
