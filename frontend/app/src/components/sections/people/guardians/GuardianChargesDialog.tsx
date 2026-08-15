import { useCallback, useEffect, useMemo, useState } from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconifyIcon from 'components/base/IconifyIcon';
import { EmptyState, ErrorBanner, SemanticChip, SemanticChipVariant } from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { ApiError } from 'services/api';
import { listGuardianYearCharges } from 'services/chargesApi';
import { Charge } from 'types/charge';
import { Guardian } from 'types/guardian';
import { formatCents } from 'utils/money';

export interface GuardianChargesDialogProps {
  open: boolean;
  schoolId: number;
  guardian: Guardian;
  onClose: () => void;
}

const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR + 1, CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

// `SemanticChip` speaks in intent, not in the API's status vocabulary.
const STATUS_VARIANT: Record<Charge['status'], SemanticChipVariant> = {
  paid: 'success',
  pending: 'warning',
  overdue: 'error',
  // Not a failure and not a debt — a boleto withdrawn on purpose. `info` is the closest the
  // palette offers to "on the record, nothing owed".
  cancelled: 'info',
};

/** ISO (`2026-03-10`) → `10/03`, split rather than parsed to avoid a timezone round trip. */
const shortDate = (iso: string | null) => {
  if (!iso) {
    return '—';
  }

  const [, month, day] = iso.split('-');

  return `${day}/${month}`;
};

/**
 * The month a charge belongs to. Tuition carries a `billing_period` — the month it covers, which is
 * the honest answer even when the boleto falls due in the next one. A one-off has no period, so it
 * is filed under the month it falls due.
 */
const monthIndexOf = (charge: Charge) => {
  const source = charge.billing_period ?? charge.due_date;
  if (!source) {
    return null;
  }

  return Number(source.split('-')[1]) - 1;
};

/**
 * A year of one payer's boletos, month by month, with what was paid and what was not.
 *
 * The school's question here is "is this family up to date", which the main charges listing answers
 * badly: it is ordered by date across every family at once. This is the same data narrowed to one
 * person and laid out by month, so a gap is visible as a gap.
 */
const GuardianChargesDialog = ({
  open,
  schoolId,
  guardian,
  onClose,
}: GuardianChargesDialogProps) => {
  const { t } = useTranslation();

  const [year, setYear] = useState(CURRENT_YEAR);
  // A guardian with more than one child sees every child's boletos mixed together, and "is this
  // family up to date" is usually asked one child at a time.
  const [childId, setChildId] = useState('');
  const [charges, setCharges] = useState<Charge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      setCharges(await listGuardianYearCharges(schoolId, guardian.id, year));
    } catch (err) {
      setCharges([]);
      setError(err instanceof ApiError ? err.message : t('common.loadConnectionError'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, guardian.id, year, t]);

  useEffect(() => {
    load();
  }, [load]);

  // Built from what came back rather than from the register: these are the children this payer
  // was actually billed for in the year, which is the only list worth filtering by here.
  const children = useMemo(() => {
    const seen = new Map<number, string>();
    charges.forEach((charge) => {
      if (charge.student) {
        seen.set(charge.student.id, charge.student.name);
      }
    });

    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [charges]);

  // A one-off raised outside any contract belongs to no child, so it is kept out of a per-child
  // view rather than attributed to whoever is selected.
  const visible = useMemo(
    () => (childId ? charges.filter((charge) => String(charge.student?.id) === childId) : charges),
    [charges, childId],
  );

  // Every month of the year is shown, including the ones with nothing in them: a family that was
  // never billed for March is exactly what the school is looking for here.
  const byMonth = useMemo(
    () =>
      MONTHS.map((label, index) => ({
        label,
        charges: visible.filter((charge) => monthIndexOf(charge) === index),
      })),
    [visible],
  );

  const totals = useMemo(() => {
    const billable = visible.filter((charge) => charge.status !== 'cancelled');

    return {
      billed: billable.reduce((sum, charge) => sum + charge.total_amount_cents, 0),
      paid: billable
        .filter((charge) => charge.status === 'paid')
        .reduce((sum, charge) => sum + charge.total_amount_cents, 0),
      open: billable.filter((charge) => charge.status !== 'paid').length,
    };
  }, [visible]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
          <Stack direction="column" gap={0.25}>
            {t('guardians.charges.title')}
            <Typography variant="body2" color="text.secondary">
              {guardian.name}
            </Typography>
          </Stack>
          <Stack direction="row" gap={1.5}>
            {/* Only worth offering when there is more than one child to tell apart. */}
            {children.length > 1 && (
              <TextField
                id="guardian-charges-child"
                label={t('guardians.charges.child')}
                value={childId}
                onChange={(e) => setChildId(e.target.value)}
                variant="filled"
                size="small"
                select
                sx={{ width: 200 }}
              >
                <MenuItem value="">{t('guardians.charges.allChildren')}</MenuItem>
                {children.map((child) => (
                  <MenuItem key={child.id} value={String(child.id)}>
                    {child.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
            <TextField
              id="guardian-charges-year"
              label={t('common.year')}
              value={String(year)}
              onChange={(e) => setYear(Number(e.target.value))}
              variant="filled"
              size="small"
              select
              sx={{ width: 120 }}
            >
              {YEAR_OPTIONS.map((option) => (
                <MenuItem key={option} value={String(option)}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        {error && <ErrorBanner message={error} onRetry={load} retryLabel={t('common.tryAgain')} />}

        {loading ? (
          <Stack alignItems="center" py={6}>
            <CircularProgress />
          </Stack>
        ) : visible.length === 0 ? (
          <EmptyState
            title={t('guardians.charges.empty.title')}
            description={t('guardians.charges.empty.description', { year: String(year) })}
            headingLevel={3}
          />
        ) : (
          <Stack direction="column" gap={2}>
            {/* What the school is really asking: is this family up to date. */}
            <Stack direction="row" gap={3} flexWrap="wrap" data-testid="guardian-charges-totals">
              <Stack direction="column">
                <Typography variant="caption" color="text.secondary">
                  {t('guardians.charges.billed')}
                </Typography>
                <Typography variant="subtitle2">{formatCents(totals.billed)}</Typography>
              </Stack>
              <Stack direction="column">
                <Typography variant="caption" color="text.secondary">
                  {t('guardians.charges.paid')}
                </Typography>
                <Typography variant="subtitle2">{formatCents(totals.paid)}</Typography>
              </Stack>
              <Stack direction="column">
                <Typography variant="caption" color="text.secondary">
                  {t('guardians.charges.stillOpen')}
                </Typography>
                <Typography variant="subtitle2">{totals.open}</Typography>
              </Stack>
            </Stack>

            <Divider />

            {byMonth.map(({ label, charges: monthCharges }) => (
              <Stack key={label} direction="column" gap={0.75}>
                <Typography variant="subtitle2">{label}</Typography>

                {monthCharges.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    {t('guardians.charges.noneInMonth')}
                  </Typography>
                ) : (
                  monthCharges.map((charge) => (
                    <Stack
                      key={charge.id}
                      direction="row"
                      gap={1.5}
                      alignItems="center"
                      flexWrap="wrap"
                    >
                      <SemanticChip
                        variant={STATUS_VARIANT[charge.status]}
                        label={t(`charges.status.${charge.status}`)}
                      />
                      <Typography variant="body2" sx={{ minWidth: 96 }}>
                        {formatCents(charge.total_amount_cents)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('charges.column.due')} {shortDate(charge.due_date)}
                      </Typography>
                      {/* A one-off says what it was for; tuition says whose it was. */}
                      <Typography variant="body2" color="text.secondary">
                        {charge.kind === 'one_off'
                          ? (charge.description ?? t('charges.kind.oneOff'))
                          : (charge.student?.name ?? t('charges.kind.tuition'))}
                      </Typography>
                      {charge.boleto_url && (
                        <Link
                          href={charge.boleto_url}
                          target="_blank"
                          rel="noopener"
                          variant="body2"
                        >
                          <Stack direction="row" gap={0.5} alignItems="center">
                            <IconifyIcon icon="mingcute:external-link-line" aria-hidden />
                            {t('charges.open')}
                          </Stack>
                        </Link>
                      )}
                    </Stack>
                  ))
                )}
              </Stack>
            ))}
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained">
          {t('common.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GuardianChargesDialog;
