import { FormEvent, useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { EmptyState, ErrorBanner, SectionCard } from 'design-system';
import { useCurrentSchool } from 'providers/useCurrentSchool';
import { ApiError } from 'services/api';
import { createTransaction, listTransactions } from 'services/transactionsApi';
import {
  SchoolTransaction,
  TRANSACTION_CATEGORY_KEYS,
  TransactionCategory,
  TransactionKind,
} from 'types/transaction';
import { useTranslation } from 'providers/I18nContext';
import { formatCents, formatCentsInput, parseCents } from 'utils/money';
import { lastDayOfMonth } from 'utils/month';
import LedgerTable from './OrdersStatusTable';

interface LedgerProps {
  /** The month on show, `YYYY-MM` — the same one the KPI row is reporting. */
  month: string;
  /** Fired after a movement is recorded, so the figures above it catch up. */
  onChanged?: () => void;
}

/**
 * The school's ledger for the month: what came in and what went out. Tuition already lives in
 * the boletos; this is everything else — textbooks sold at the counter, the payroll, the rent.
 */
const Ledger = ({ month, onChanged }: LedgerProps) => {
  const { t } = useTranslation();
  const school = useCurrentSchool();
  const schoolId = school?.school_id ?? null;

  const [rows, setRows] = useState<SchoolTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [kind, setKind] = useState<TransactionKind | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [formKind, setFormKind] = useState<TransactionKind>('income');
  const [formCategory, setFormCategory] = useState<TransactionCategory>('didactic_material');
  const [amount, setAmount] = useState('');
  const [occurredOn, setOccurredOn] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    if (!schoolId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await listTransactions({
        schoolId,
        page: page + 1,
        kind: kind === 'all' ? undefined : kind,
        from: `${month}-01`,
        to: `${month}-${String(lastDayOfMonth(month)).padStart(2, '0')}`,
      });

      setRows(response.data);
      setTotal(response.meta.total);
    } catch (err) {
      setRows([]);
      setTotal(0);
      setError(
        err instanceof ApiError ? err.message : t('ledger.loadError'),
      );
    } finally {
      setLoading(false);
    }
  }, [schoolId, page, kind, month, t]);

  useEffect(() => {
    load();
  }, [load]);

  // A different month or filter is a different list; staying on page 4 of it makes no sense.
  useEffect(() => {
    setPage(0);
  }, [month, kind]);

  const openForm = () => {
    setFormKind('income');
    setFormCategory('didactic_material');
    setAmount('');
    setOccurredOn(`${month}-01`);
    setDescription('');
    setFormError('');
    setFormOpen(true);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!schoolId) {
      return;
    }

    const cents = parseCents(amount);

    if (!cents) {
      setFormError(t('ledger.form.amountRequired'));
      return;
    }
    if (!occurredOn) {
      setFormError(t('ledger.form.dateRequired'));
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      await createTransaction(schoolId, {
        kind: formKind,
        category: formCategory,
        amount_cents: cents,
        occurred_on: occurredOn,
        description: description.trim() || null,
      });

      setFormOpen(false);
      load();
      onChanged?.();
    } catch (err) {
      if (err instanceof ApiError) {
        const base = err.details.base;
        setFormError(Array.isArray(base) && typeof base[0] === 'string' ? base[0] : err.message);
      } else {
        setFormError(t('ledger.form.error'));
      }
    } finally {
      setSaving(false);
    }
  };

  const balanceCents = rows.reduce((sum, row) => sum + row.signed_amount_cents, 0);

  return (
    <SectionCard
      padding={0}
      title={t('ledger.title')}
      headerActions={
        <>
          <ToggleButtonGroup
            value={kind}
            exclusive
            size="small"
            onChange={(_, value) => value && setKind(value)}
            aria-label={t('ledger.filter')}
          >
            <ToggleButton value="all">{t('ledger.filter.all')}</ToggleButton>
            <ToggleButton value="income">{t('ledger.filter.income')}</ToggleButton>
            <ToggleButton value="expense">{t('ledger.filter.expense')}</ToggleButton>
          </ToggleButtonGroup>
          <Button variant="contained" size="small" onClick={openForm}>
            {t('ledger.new')}
          </Button>
        </>
      }
    >
      {error && (
        <Box px={3.5} pb={2}>
          <ErrorBanner message={error} />
        </Box>
      )}

      {!loading && rows.length === 0 && !error ? (
        <EmptyState
          title={t('ledger.empty.title')}
          description={t('ledger.empty.description')}
          action={
            <Button variant="contained" size="small" onClick={openForm}>
              {t('ledger.new')}
            </Button>
          }
        />
      ) : (
        <>
          <Box px={3.5} pb={3.5} sx={{ height: 520, width: 1, flexShrink: 0 }}>
            <LedgerTable
              rows={rows}
              loading={loading}
              total={total}
              page={page}
              onPageChange={setPage}
            />
          </Box>

          <Stack px={3.5} pb={3.5} justifyContent="flex-end" gap={1}>
            <Typography variant="body2" color="text.secondary">
              {t('ledger.balance')}
            </Typography>
            <Typography
              variant="body2"
              fontWeight={600}
              color={balanceCents >= 0 ? 'success.main' : 'error.main'}
            >
              {formatCents(balanceCents)}
            </Typography>
          </Stack>
        </>
      )}

      <Dialog
        open={formOpen}
        onClose={saving ? undefined : () => setFormOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('ledger.new')}</DialogTitle>
        <Stack component="form" onSubmit={handleSubmit} direction="column" noValidate>
          <DialogContent>
            <Grid container spacing={2.5} pt={0.5}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  id="transaction-kind"
                  label={t('ledger.form.kind')}
                  value={formKind}
                  onChange={(e) => setFormKind(e.target.value as TransactionKind)}
                  variant="filled"
                  select
                  fullWidth
                  required
                >
                  <MenuItem value="income">{t('transaction.kind.income')}</MenuItem>
                  <MenuItem value="expense">{t('transaction.kind.expense')}</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  id="transaction-category"
                  label={t('ledger.form.category')}
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as TransactionCategory)}
                  variant="filled"
                  select
                  fullWidth
                  required
                >
                  {(
                    Object.keys(TRANSACTION_CATEGORY_KEYS) as TransactionCategory[]
                  ).map((category) => (
                    <MenuItem key={category} value={category}>
                      {t(TRANSACTION_CATEGORY_KEYS[category])}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  id="transaction-amount"
                  label={t('common.amount')}
                  value={amount}
                  onChange={(e) => setAmount(formatCentsInput(e.target.value))}
                  variant="filled"
                  fullWidth
                  required
                  inputMode="numeric"
                  slotProps={{
                    input: {
                      startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                    },
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  id="transaction-date"
                  label={t('ledger.form.date')}
                  type="date"
                  value={occurredOn}
                  onChange={(e) => setOccurredOn(e.target.value)}
                  variant="filled"
                  fullWidth
                  required
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  id="transaction-description"
                  label={t('common.description')}
                  placeholder={t('ledger.form.descriptionPlaceholder')}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  variant="filled"
                  fullWidth
                />
              </Grid>
              {formError && (
                <Grid size={12}>
                  <ErrorBanner message={formError} />
                </Grid>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setFormOpen(false)} color="inherit" disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={saving}
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {saving ? t('ledger.form.submitting') : t('ledger.form.submit')}
            </Button>
          </DialogActions>
        </Stack>
      </Dialog>
    </SectionCard>
  );
};

export default Ledger;
