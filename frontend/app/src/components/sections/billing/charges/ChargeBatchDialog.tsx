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
import { GridColDef, GridRenderCellParams, GridRowSelectionModel } from '@mui/x-data-grid';
import { DataTable, EmptyState, ErrorBanner } from 'design-system';
import { ApiError } from 'services/api';
import { createChargeBatch, listBillableContracts } from 'services/chargesApi';
import { BillableContract, ChargeBatchResult } from 'types/charge';
import { formatCpf } from 'utils/documentNumber';
import { formatCents } from 'utils/money';
import { currentMonth } from 'utils/month';
import { useTranslation } from 'providers/I18nContext';

interface ChargeBatchDialogProps {
  open: boolean;
  schoolId: number;
  onClose: () => void;
  /** Fired once the batch went out, so the listing behind the dialog can refresh. */
  onIssued: (result: ChargeBatchResult) => void;
}

type BillableRow = BillableContract & { id: number };

/**
 * Billing a whole month at once. The school picks contracts — all of them, in one click, is the
 * common case — and each is billed at its own monthly amount. What the bank needs beyond that is
 * the period and, when the school wants every slip on the same day, a single due date.
 *
 * A contract the period already covers is shown but cannot be selected: billing it again would
 * hand the family a second boleto for the same month.
 */
/**
 * The school bills on the 5th, so that is where the batch starts — following the period rather
 * than a fixed date, since a batch for October is not due in September. Still editable: a month
 * whose 5th falls badly is a real case.
 */
const fifthOf = (period: string) => `${period}-05`;

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
  const [rows, setRows] = useState<BillableRow[]>([]);
  const [selected, setSelected] = useState<GridRowSelectionModel>(emptySelection);
  const [loading, setLoading] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await listBillableContracts(schoolId, period);
      const mapped = data.map((row) => ({ ...row, id: row.contract_id }));
      setRows(mapped);
      // Everything the period does not cover yet starts ticked: billing the whole month is what
      // this screen is for, and unticking a few is less work than ticking a hundred.
      setSelected(
        includeSelection(mapped.filter((row) => !row.already_charged).map((row) => row.contract_id)),
      );
    } catch (err) {
      setRows([]);
      setSelected(emptySelection());
      setError(
        err instanceof ApiError ? err.message : t('charges.batch.loadError'),
      );
    } finally {
      setLoading(false);
    }
  }, [schoolId, period, t]);

  useEffect(() => {
    if (!open) {
      return;
    }

    load();
  }, [open, load]);

  const selectedIds = useMemo(() => selectionIds(selected), [selected]);

  const totalCents = useMemo(
    () =>
      rows
        .filter((row) => selectedIds.includes(row.contract_id))
        .reduce((sum, row) => sum + row.monthly_amount_cents, 0),
    [rows, selectedIds],
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
        minWidth: 140,
        renderCell: ({ row }: GridRenderCellParams<BillableRow>) => (
          <>
            <Typography variant="body2">{row.student_name ?? '—'}</Typography>
            {row.already_charged && (
              <Typography variant="caption" color="text.secondary" display="block">
                {t('charges.batch.alreadyBilled')}
              </Typography>
            )}
          </>
        ),
      },
      {
        field: 'payer',
        headerName: t('charges.column.billedTo'),
        flex: 1,
        minWidth: 160,
        sortable: false,
        renderCell: ({ row }: GridRenderCellParams<BillableRow>) =>
          row.payer ? (
            <>
              <Typography variant="body2">{row.payer.name}</Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                CPF {formatCpf(row.payer.cpf)}
              </Typography>
            </>
          ) : (
            <Typography variant="body2" color="error.main">
              {t('charges.batch.noPayer')}
            </Typography>
          ),
      },
      {
        field: 'monthly_amount_cents',
        headerName: t('charges.batch.monthly'),
        width: 120,
        align: 'right',
        headerAlign: 'right',
        renderCell: ({ value }: GridRenderCellParams<BillableRow, number>) => (
          <Typography variant="body2">{formatCents(value ?? 0)}</Typography>
        ),
      },
      {
        field: 'due_day',
        headerName: t('charges.batch.dueDay'),
        width: 100,
        align: 'right',
        headerAlign: 'right',
        renderCell: ({ value }: GridRenderCellParams<BillableRow, number | null>) => (
          <Typography variant="body2">{value ?? 10}</Typography>
        ),
      },
    ],
    [t],
  );

  return (
    <Dialog open={open} onClose={issuing ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>{t('charges.batch.title')}</DialogTitle>
      <Stack component="form" onSubmit={handleSubmit} direction="column" noValidate>
        <DialogContent>
          <Grid container spacing={2.5} pt={0.5}>
            <Grid size={{ xs: 12, sm: 6 }}>
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
            <Grid size={{ xs: 12, sm: 6 }}>
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
                <Box sx={{ height: 340, width: 1 }}>
                  <DataTable
                    rows={rows}
                    columns={columns}
                    checkboxSelection
                    disableRowSelectionOnClick
                    rowSelectionModel={selected}
                    onRowSelectionModelChange={setSelected}
                    isRowSelectable={({ row }) => !row.already_charged}
                    hideFooter
                    density="compact"
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
