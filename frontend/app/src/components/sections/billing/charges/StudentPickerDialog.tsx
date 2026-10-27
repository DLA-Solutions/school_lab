import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { DataTable, EmptyState, ErrorBanner, SemanticChip } from 'design-system';
import { ApiError } from 'services/api';
import { listBillableStudents } from 'services/chargesApi';
import { getActiveSchoolYear, listSchoolYears, SchoolYear } from 'services/schoolYearsApi';
import { BillableGap, BillableStudent } from 'types/charge';
import { formatCpf } from 'utils/documentNumber';
import { useTranslation } from 'providers/I18nContext';
import type { MessageKey } from 'locales';

interface StudentPickerDialogProps {
  open: boolean;
  schoolId: number;
  onClose: () => void;
  /** Fired with an eligible row — one carrying a standing (active, signed) contract. */
  onSelect: (student: BillableStudent) => void;
  /**
   * Billing someone unrelated to any enrolled student — or a payer with no contract at all — is
   * still a real case the avulso flow has always supported; this is the way out of the picker
   * back to searching a guardian directly.
   */
  onSkip: () => void;
}

type StudentRow = BillableStudent & { id: number };

const TAG_LABELS: Record<BillableGap, MessageKey> = {
  cancelled: 'charges.tag.cancelled',
  pending_signature: 'charges.tag.pendingSignature',
};

const TAG_VARIANTS: Record<BillableGap, 'error' | 'warning'> = {
  cancelled: 'error',
  pending_signature: 'warning',
};

/**
 * The "every year" option. A MUI `Select` hides the chosen item's label when the value is an
 * empty string (unless `displayEmpty` is set), so the unfiltered state needs a real sentinel
 * rather than `''`.
 */
const ALL_SCHOOL_YEARS = 'all';

/** Only a student with a standing (active, signed) contract can be picked here — the same
 * eligibility the bulk emission screen applies. */
const isEligible = (row: BillableStudent) => row.contract_id !== null;

/**
 * The avulso flow's first step: pick the student, so the payer and contract resolve from them
 * instead of staff hunting a guardian independently. A student without a billable contract is
 * still listed — never dropped — but cannot be picked here; `onSkip` is the way to bill someone
 * that step does not cover.
 */
const StudentPickerDialog = ({ open, schoolId, onClose, onSelect, onSkip }: StudentPickerDialogProps) => {
  const { t } = useTranslation();
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [schoolYearId, setSchoolYearId] = useState(ALL_SCHOOL_YEARS);
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      return;
    }

    let current = true;

    const loadSchoolYears = async () => {
      try {
        const [years, active] = await Promise.all([
          listSchoolYears(schoolId),
          getActiveSchoolYear(schoolId),
        ]);
        if (current) {
          setSchoolYears(years);
          setSchoolYearId(active ? String(active.id) : ALL_SCHOOL_YEARS);
        }
      } catch {
        if (current) {
          setSchoolYears([]);
        }
      }
    };

    loadSchoolYears();

    return () => {
      current = false;
    };
  }, [open, schoolId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await listBillableStudents(
        schoolId,
        schoolYearId === ALL_SCHOOL_YEARS ? null : Number(schoolYearId),
      );
      setRows(data.map((row) => ({ ...row, id: row.student_id })));
    } catch (err) {
      setRows([]);
      setError(err instanceof ApiError ? err.message : t('charges.studentPicker.loadError'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, schoolYearId, t]);

  useEffect(() => {
    if (!open) {
      return;
    }

    load();
  }, [open, load]);

  const ineligibleCount = useMemo(
    () => rows.filter((row) => !isEligible(row)).length,
    [rows],
  );

  const columns: GridColDef<StudentRow>[] = useMemo(
    () => [
      {
        field: 'student_name',
        headerName: t('common.student'),
        flex: 1,
        minWidth: 160,
        renderCell: ({ row }: GridRenderCellParams<StudentRow>) => (
          <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
            <Typography variant="body2" noWrap title={row.student_name || undefined}>
              {row.student_name || '—'}
            </Typography>
            {row.without_contract && (
              <SemanticChip variant="warning" label={t('charges.batch.withoutContract')} />
            )}
            {row.tags.map((tag) => (
              <SemanticChip key={tag} variant={TAG_VARIANTS[tag]} label={t(TAG_LABELS[tag])} />
            ))}
          </Stack>
        ),
      },
      {
        field: 'payer',
        headerName: t('charges.column.billedTo'),
        flex: 1,
        minWidth: 200,
        sortable: false,
        renderCell: ({ row }: GridRenderCellParams<StudentRow>) =>
          !isEligible(row) ? (
            <Typography variant="body2" color="text.secondary">
              —
            </Typography>
          ) : row.payer ? (
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" noWrap title={row.payer.name}>
                {row.payer.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap display="block">
                CPF {formatCpf(row.payer.cpf)}
              </Typography>
            </Box>
          ) : (
            <Typography variant="body2" color="error.main">
              {t('charges.batch.noPayer')}
            </Typography>
          ),
      },
      {
        field: 'actions',
        headerName: '',
        width: 130,
        sortable: false,
        filterable: false,
        align: 'right',
        headerAlign: 'right',
        renderCell: ({ row }: GridRenderCellParams<StudentRow>) =>
          isEligible(row) ? (
            <Button
              size="small"
              variant="outlined"
              aria-label={t('charges.studentPicker.selectAction', { student: row.student_name })}
              // `row` carries the grid's synthetic `id` (keyed off `student_id`) alongside the
              // real fields; the caller only wants the API row it asked for.
              onClick={() => {
                const { student_id, student_name, contract_id, payer, without_contract, tags } = row;
                onSelect({ student_id, student_name, contract_id, payer, without_contract, tags });
              }}
            >
              {t('charges.studentPicker.select')}
            </Button>
          ) : null,
      },
    ],
    [onSelect, t],
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{t('charges.studentPicker.title')}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2.5} pt={0.5}>
          <Grid size={12}>
            <Typography variant="body2" color="text.secondary">
              {t('charges.studentPicker.description')}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 5 }}>
            <TextField
              id="student-picker-school-year"
              label={t('charges.schoolYearFilter.label')}
              value={schoolYearId}
              onChange={(e) => setSchoolYearId(e.target.value)}
              variant="filled"
              select
              fullWidth
            >
              <MenuItem value={ALL_SCHOOL_YEARS}>{t('charges.schoolYearFilter.all')}</MenuItem>
              {schoolYears.map((year) => (
                <MenuItem key={year.id} value={String(year.id)}>
                  {year.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid size={12}>
            {loading ? (
              <Stack justifyContent="center" py={4}>
                <CircularProgress size={28} />
              </Stack>
            ) : rows.length === 0 ? (
              <EmptyState
                title={t('charges.studentPicker.empty.title')}
                description={t('charges.studentPicker.empty.description')}
                headingLevel={3}
              />
            ) : (
              <Box sx={{ height: 380, width: 1 }}>
                <DataTable
                  rows={rows}
                  columns={columns}
                  disableRowSelectionOnClick
                  hideFooter
                  density="compact"
                  rowHeight={56}
                  localeText={{ noRowsLabel: t('charges.studentPicker.empty.title') }}
                />
              </Box>
            )}
          </Grid>

          {ineligibleCount > 0 && (
            <Grid size={12}>
              <Typography variant="body2" color="text.secondary">
                {t('charges.studentPicker.ineligibleHint')}
              </Typography>
            </Grid>
          )}

          {error && (
            <Grid size={12}>
              <ErrorBanner message={error} />
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          {t('common.cancel')}
        </Button>
        <Button onClick={onSkip} variant="outlined">
          {t('charges.studentPicker.skip')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StudentPickerDialog;
