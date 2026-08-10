import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { EmptyState, ErrorBanner } from 'design-system';
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

const ChargeBatchDialog = ({ open, schoolId, onClose, onIssued }: ChargeBatchDialogProps) => {
  const { t } = useTranslation();
  const [period, setPeriod] = useState(currentMonth);
  const [dueDate, setDueDate] = useState(() => fifthOf(currentMonth()));
  const [rows, setRows] = useState<BillableContract[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [error, setError] = useState('');

  const billable = useMemo(() => rows.filter((row) => !row.already_charged), [rows]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await listBillableContracts(schoolId, period);
      setRows(data);
      // Everything the period does not cover yet starts ticked: billing the whole month is what
      // this screen is for, and unticking a few is less work than ticking a hundred.
      setSelected(data.filter((row) => !row.already_charged).map((row) => row.contract_id));
    } catch (err) {
      setRows([]);
      setSelected([]);
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

  const toggle = (contractId: number) => {
    setSelected((current) =>
      current.includes(contractId)
        ? current.filter((id) => id !== contractId)
        : [...current, contractId],
    );
  };

  const toggleAll = () => {
    setSelected((current) =>
      current.length === billable.length ? [] : billable.map((row) => row.contract_id),
    );
  };

  const totalCents = useMemo(
    () =>
      rows
        .filter((row) => selected.includes(row.contract_id))
        .reduce((sum, row) => sum + row.monthly_amount_cents, 0),
    [rows, selected],
  );

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (selected.length === 0) {
      setError(t('charges.batch.selectAtLeastOne'));
      return;
    }

    setIssuing(true);
    setError('');

    try {
      const result = await createChargeBatch(schoolId, {
        contract_ids: selected,
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

  const allSelected = billable.length > 0 && selected.length === billable.length;

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
                <Box sx={{ maxHeight: 340, overflowY: 'auto' }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={allSelected}
                            indeterminate={selected.length > 0 && !allSelected}
                            onChange={toggleAll}
                            disabled={billable.length === 0}
                            inputProps={{ 'aria-label': t('charges.batch.selectAll') }}
                          />
                        </TableCell>
                        <TableCell>{t('common.student')}</TableCell>
                        <TableCell>{t('charges.column.billedTo')}</TableCell>
                        <TableCell align="right">{t('charges.batch.monthly')}</TableCell>
                        <TableCell align="right">{t('charges.batch.dueDay')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.map((row) => (
                        <TableRow key={row.contract_id} hover>
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={selected.includes(row.contract_id)}
                              onChange={() => toggle(row.contract_id)}
                              disabled={row.already_charged}
                              inputProps={{
                                'aria-label': t('charges.batch.selectOne', {
                                  student: row.student_name ?? row.contract_id,
                                }),
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{row.student_name ?? '—'}</Typography>
                            {row.already_charged && (
                              <Typography variant="caption" color="text.secondary">
                                {t('charges.batch.alreadyBilled')}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {row.payer ? (
                              <>
                                <Typography variant="body2">{row.payer.name}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  CPF {formatCpf(row.payer.cpf)}
                                </Typography>
                              </>
                            ) : (
                              <Typography variant="body2" color="error.main">
                                {t('charges.batch.noPayer')}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {formatCents(row.monthly_amount_cents)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">{row.due_day ?? 10}</Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </Grid>

            {selected.length > 0 && (
              <Grid size={12}>
                <Alert severity="info">
                  {t('charges.batch.selected', {
                    count: selected.length,
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
            disabled={issuing || loading || selected.length === 0}
            startIcon={issuing ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {issuing
              ? t('charges.batch.submitting')
              : t('charges.batch.submit', { count: selected.length })}
          </Button>
        </DialogActions>
      </Stack>
    </Dialog>
  );
};

export default ChargeBatchDialog;
