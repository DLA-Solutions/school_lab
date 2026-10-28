import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import MenuItem from '@mui/material/MenuItem';
import { GridColDef, GridRenderCellParams, GridRowSelectionModel } from '@mui/x-data-grid';
import { DataTable, EmptyState, ErrorBanner, SemanticChip } from 'design-system';
import { ApiError } from 'services/api';
import { createChargeBatch, listBillableContracts } from 'services/chargesApi';
import { getActiveSchoolYear, listSchoolYears, SchoolYear } from 'services/schoolYearsApi';
import { BillableContract, BillableGap, ChargeBatchResult } from 'types/charge';
import { formatCpf } from 'utils/documentNumber';
import { formatCents } from 'utils/money';
import { currentMonth } from 'utils/month';
import { useTranslation } from 'providers/I18nContext';
import type { MessageKey } from 'locales';

interface ChargeBatchDialogProps {
  open: boolean;
  schoolId: number;
  onClose: () => void;
  /** Fired once the batch went out, so the listing behind the dialog can refresh. */
  onIssued: (result: ChargeBatchResult) => void;
}

/** Keyed by student: a student without a contract has no `contract_id` to key the row by. */
type BillableRow = BillableContract & { id: number };

/**
 * Billing a whole month at once. The school picks contracts — all of them, in one click, is the
 * common case — and each is billed at its own monthly amount. What the bank needs beyond that is
 * the period and, when the school wants every slip on the same day, a single due date.
 *
 * A contract the period already covers is shown but cannot be selected: billing it again would
 * hand the family a second boleto for the same month. The same goes for an enrolled student with
 * no contract — listed so the school sees who is missing one, but there is nothing to bill.
 */
/**
 * The school bills on the 5th, so that is where the batch starts — following the period rather
 * than a fixed date, since a batch for October is not due in September. Still editable: a month
 * whose 5th falls badly is a real case.
 */
const fifthOf = (period: string) => `${period}-05`;

/**
 * The "every year" option. A MUI `Select` hides the chosen item's label when the value is an
 * empty string (unless `displayEmpty` is set), so the unfiltered state needs a real sentinel
 * rather than `''` — same trick `STATUS_FILTERS` uses on the charges listing itself.
 */
const ALL_SCHOOL_YEARS = 'all';

/**
 * Only a row with a standing (active, signed) contract the period has not billed yet can go into
 * the batch. `without_contract` and `tags` are both ways of having no such contract — a tagged
 * row still has `contract_id: null`, so checking that directly covers both without needing to
 * know which one applies.
 */
const isBillable = (row: BillableContract) => row.contract_id !== null && !row.already_charged;

/** A row with neither a contract nor the history that would explain the gap (`without_contract`
 * or `tags`) never happens — every row either bills, or says why not. */
const hasNoContractData = (row: BillableContract) => row.contract_id === null;

const TAG_LABELS: Record<BillableGap, MessageKey> = {
  cancelled: 'charges.tag.cancelled',
  pending_signature: 'charges.tag.pendingSignature',
};

/** `cancelled` reads as the more serious gap (nothing stands in for the student); a contract
 * still awaiting signature is a softer, in-progress state. */
const TAG_VARIANTS: Record<BillableGap, 'error' | 'warning'> = {
  cancelled: 'error',
  pending_signature: 'warning',
};

const emptySelection = (): GridRowSelectionModel => ({
  type: 'include',
  ids: new Set(),
});

const includeSelection = (ids: number[]): GridRowSelectionModel => ({
  type: 'include',
  ids: new Set(ids),
});

const selectionIds = (model: GridRowSelectionModel): number[] =>
  Array.from(model.ids).filter((id): id is number => typeof id === 'number');

const ChargeBatchDialog = ({ open, schoolId, onClose, onIssued }: ChargeBatchDialogProps) => {
  const { t } = useTranslation();
  const [period, setPeriod] = useState(currentMonth);
  const [dueDate, setDueDate] = useState(() => fifthOf(currentMonth()));
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [schoolYearId, setSchoolYearId] = useState(ALL_SCHOOL_YEARS);
  const [rows, setRows] = useState<BillableRow[]>([]);
  const [selected, setSelected] = useState<GridRowSelectionModel>(emptySelection);
  const [loading, setLoading] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [error, setError] = useState('');

  // The current school year is the common case for billing, so the filter starts there; staff
  // can still fall back to every year from the dropdown.
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
      const data = await listBillableContracts(
        schoolId,
        period,
        schoolYearId === ALL_SCHOOL_YEARS ? null : Number(schoolYearId),
      );
      const mapped = data.map((row) => ({ ...row, id: row.student_id }));
      setRows(mapped);
      // Everything billable the period does not cover yet starts ticked: billing the whole month
      // is what this screen is for, and unticking a few is less work than ticking a hundred.
      // A student with nothing billable — no contract, or only a cancelled/unsigned one — is
      // never ticked: there is nothing of theirs to bill.
      setSelected(includeSelection(mapped.filter(isBillable).map((row) => row.student_id)));
    } catch (err) {
      setRows([]);
      setSelected(emptySelection());
      setError(
        err instanceof ApiError ? err.message : t('charges.batch.loadError'),
      );
    } finally {
      setLoading(false);
    }
  }, [schoolId, period, schoolYearId, t]);

  useEffect(() => {
    if (!open) {
      return;
    }

    load();
  }, [open, load]);

  // The grid selects by student; what goes to the API is the contract of each ticked, billable row.
  const selectedRows = useMemo(() => {
    const studentIds = new Set(selectionIds(selected));

    return rows.filter((row) => studentIds.has(row.student_id) && isBillable(row));
  }, [rows, selected]);

  const selectedIds = useMemo(
    () =>
      selectedRows
        .map((row) => row.contract_id)
        .filter((id): id is number => id !== null),
    [selectedRows],
  );

  const totalCents = useMemo(
    () => selectedRows.reduce((sum, row) => sum + (row.monthly_amount_cents ?? 0), 0),
    [selectedRows],
  );

  const withoutContractCount = useMemo(
    () => rows.filter((row) => row.without_contract).length,
    [rows],
  );

  const taggedCount = useMemo(() => rows.filter((row) => row.tags.length > 0).length, [rows]);

  // A billable row (has a contract) can still have no payer when the student has no kept
  // guardian link at all — distinct from `withoutContract`/`tags`, which are about the contract,
  // not the payer. Actionable: staff need to link a guardian to the student, not create a contract.
  const noGuardianLinkedCount = useMemo(
    () => rows.filter((row) => row.payer_missing_reason === 'no_guardian_linked').length,
    [rows],
  );

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (selectedIds.length === 0) {
      setError(t('charges.batch.selectAtLeastOne'));
      return;
    }

    setIssuing(true);
    setError('');

    try {
      const result = await createChargeBatch(schoolId, {
        contract_ids: selectedIds,
        billing_period: period,
        due_date: dueDate || null,
      });

      onIssued(result);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        const base = err.details.base;
        setError(Array.isArray(base) && typeof base[0] === 'string' ? base[0] : err.message);
      } else {
        setError(t('charges.batch.error'));
      }
    } finally {
      setIssuing(false);
    }
  };

  const columns: GridColDef<BillableRow>[] = useMemo(
    () => [
      {
        field: 'student_name',
        headerName: t('common.student'),
        flex: 1,
        minWidth: 160,
        renderCell: ({ row }: GridRenderCellParams<BillableRow>) => (
          <Box sx={{ minWidth: 0 }}>
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
            {row.already_charged && (
              <Typography variant="caption" color="text.secondary" noWrap display="block">
                {t('charges.batch.alreadyBilled')}
              </Typography>
            )}
          </Box>
        ),
      },
      {
        field: 'payer',
        headerName: t('charges.column.billedTo'),
        flex: 1,
        minWidth: 200,
        sortable: false,
        renderCell: ({ row }: GridRenderCellParams<BillableRow>) =>
          hasNoContractData(row) ? (
            <Typography variant="body2" color="text.secondary">
              —
            </Typography>
          ) : row.payer ? (
            // The grid cell is a flex row, so the two lines need their own column wrapper — as bare
            // siblings the CPF would sit beside the name and collide with it.
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" noWrap title={row.payer.name}>
                {row.payer.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap display="block">
                CPF {formatCpf(row.payer.cpf)}
              </Typography>
            </Box>
          ) : row.payer_missing_reason === 'no_guardian_linked' ? (
            // The specific, actionable case: the student has no guardian link at all, so there is
            // nothing a contract could point to. A chip, like the other row-level flags, rather
            // than the generic text below — staff can tell this apart from an unresolved payer.
            <SemanticChip variant="error" label={t('charges.batch.noGuardianLinked')} />
          ) : (
            <Typography variant="body2" color="error.main">
              {t('charges.batch.noPayer')}
            </Typography>
          ),
      },
      {
        field: 'monthly_amount_cents',
        headerName: t('charges.batch.monthly'),
        width: 130,
        align: 'right',
        headerAlign: 'right',
        renderCell: ({ value }: GridRenderCellParams<BillableRow, number>) => (
          <Typography variant="body2">{value == null ? '—' : formatCents(value)}</Typography>
        ),
      },
      {
        field: 'due_day',
        headerName: t('charges.batch.dueDay'),
        width: 110,
        align: 'right',
        headerAlign: 'right',
        renderCell: ({ row, value }: GridRenderCellParams<BillableRow, number | null>) => (
          <Typography variant="body2">{hasNoContractData(row) ? '—' : (value ?? 10)}</Typography>
        ),
      },
    ],
    [t],
  );

  return (
    <Dialog open={open} onClose={issuing ? undefined : onClose} maxWidth="lg" fullWidth>
      <DialogTitle>{t('charges.batch.title')}</DialogTitle>
      <Stack component="form" onSubmit={handleSubmit} direction="column" noValidate>
        <DialogContent>
          <Grid container spacing={2.5} pt={0.5}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                id="batch-period"
                label={t('charges.batch.period')}
                type="month"
                value={period}
                onChange={(e) => {
                  setPeriod(e.target.value);
                  // The due date belongs to the period; moving one without the other would bill
                  // October's tuition on a September date.
                  if (e.target.value) {
                    setDueDate(fifthOf(e.target.value));
                  }
                }}
                variant="filled"
                fullWidth
                required
                slotProps={{ inputLabel: { shrink: true } }}
                helperText={t('charges.batch.periodHelp')}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                id="batch-due-date"
                label={t('charges.batch.dueDate')}
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                variant="filled"
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
                helperText={t('charges.batch.dueDateHelp')}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                id="batch-school-year"
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
                  title={t('charges.batch.empty.title')}
                  description={t('charges.batch.empty.description')}
                  headingLevel={3}
                />
              ) : (
                <Box sx={{ height: 380, width: 1 }}>
                  <DataTable
                    rows={rows}
                    columns={columns}
                    checkboxSelection
                    disableRowSelectionOnClick
                    rowSelectionModel={selected}
                    onRowSelectionModelChange={setSelected}
                    isRowSelectable={({ row }) => isBillable(row)}
                    hideFooter
                    density="compact"
                    rowHeight={56}
                    localeText={{
                      noRowsLabel: t('charges.batch.empty.title'),
                      checkboxSelectionSelectAllRows: t('charges.batch.selectAll'),
                      checkboxSelectionUnselectAllRows: t('charges.batch.selectAll'),
                      checkboxSelectionSelectRow: t('charges.batch.selectRow'),
                      checkboxSelectionUnselectRow: t('charges.batch.selectRow'),
                    }}
                  />
                </Box>
              )}
            </Grid>

            {withoutContractCount > 0 && (
              <Grid size={12}>
                <Alert severity="warning">{t('charges.batch.withoutContractHint')}</Alert>
              </Grid>
            )}

            {taggedCount > 0 && (
              <Grid size={12}>
                <Alert severity="warning">
                  {t('charges.batch.taggedHint', { count: taggedCount })}
                </Alert>
              </Grid>
            )}

            {noGuardianLinkedCount > 0 && (
              <Grid size={12}>
                <Alert severity="warning">
                  {t('charges.batch.noGuardianLinkedHint', { count: noGuardianLinkedCount })}
                </Alert>
              </Grid>
            )}

            {selectedIds.length > 0 && (
              <Grid size={12}>
                <Alert severity="info">
                  {t('charges.batch.selected', {
                    count: selectedIds.length,
                    amount: formatCents(totalCents),
                  })}
                </Alert>
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
          <Button onClick={onClose} color="inherit" disabled={issuing}>
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={issuing || loading || selectedIds.length === 0}
            startIcon={issuing ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {issuing
              ? t('charges.batch.submitting')
              : t('charges.batch.submit', { count: selectedIds.length })}
          </Button>
        </DialogActions>
      </Stack>
    </Dialog>
  );
};

export default ChargeBatchDialog;
