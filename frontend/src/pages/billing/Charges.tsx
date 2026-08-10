import { FormEvent, useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import IconifyIcon from 'components/base/IconifyIcon';
import {
  ConfirmDialog,
  DataTable,
  EmptyState,
  ErrorBanner,
  PageHeader,
  SearchField,
  SectionCard,
  SemanticChip,
} from 'design-system';
import ChargeBatchDialog from 'components/sections/billing/charges/ChargeBatchDialog';
import { useCurrentSchool } from 'providers/useCurrentSchool';
import { ApiError } from 'services/api';
import { cancelCharge, createOneOffCharge, listCharges } from 'services/chargesApi';
import { listContracts } from 'services/contractsApi';
import { listGuardians } from 'services/guardiansApi';
import { Charge } from 'types/charge';
import { Contract } from 'types/contract';
import { Guardian } from 'types/guardian';
import { formatCpf } from 'utils/documentNumber';
import { formatCents, formatCentsInput, parseCents } from 'utils/money';
import { useDebouncedValue } from 'utils/useDebouncedValue';
import { useTranslation } from 'providers/I18nContext';
import type { MessageKey } from 'locales';

const PAGE_SIZE = 25;

const STATUS_KEYS: Record<Charge['status'], MessageKey> = {
  pending: 'charges.status.pending',
  overdue: 'charges.status.overdue',
  paid: 'charges.status.paid',
  cancelled: 'charges.status.cancelled',
};

const STATUS_VARIANTS: Record<Charge['status'], 'success' | 'warning' | 'error' | 'info'> = {
  pending: 'warning',
  overdue: 'error',
  paid: 'success',
  cancelled: 'info',
};

/**
 * What the filter offers. "Open" covers pending and overdue together: a family with a late
 * boleto has not paid it, and splitting the two would make the school look in two places for
 * the same unpaid slip.
 */
const STATUS_FILTERS: { value: string; label: MessageKey; statuses: string[] }[] = [
  { value: 'all', label: 'charges.filter.all', statuses: [] },
  { value: 'open', label: 'charges.filter.open', statuses: ['pending', 'overdue'] },
  { value: 'paid', label: 'charges.filter.paid', statuses: ['paid'] },
  { value: 'cancelled', label: 'charges.filter.cancelled', statuses: ['cancelled'] },
];

/**
 * Split rather than `new Date`: a bare ISO date parsed as UTC shows the day before here. The
 * order follows the locale — a Brazilian reads 05/09 as 5 September, an American as 9 May, and
 * getting that backwards on a due date is not a cosmetic error.
 */
const formatDate = (value: string | null, locale: string) => {
  if (!value) {
    return '—';
  }

  const [year, month, day] = value.split('-');

  return locale === 'en-US' ? `${month}/${day}/${year}` : `${day}/${month}/${year}`;
};

/** Name and CPF in one line, which is how a payer is recognised in a list of them. */
const guardianLabel = (guardian: Guardian) => `${guardian.name} — ${formatCpf(guardian.cpf)}`;

/**
 * The school's boletos. Beyond listing what the monthly schedule produced, this is where a
 * one-off charge is raised — against a guardian, with a contract named only when the charge
 * actually belongs to one — and where a whole month is billed in a single pass.
 */
const Charges = () => {
  const { t, locale } = useTranslation();
  const school = useCurrentSchool();
  const schoolId = school?.school_id ?? null;

  const [charges, setCharges] = useState<Charge[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [statusFilter, setStatusFilter] = useState('all');

  const [formOpen, setFormOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [cancelling, setCancelling] = useState<Charge | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  // One field: the operator types part of a name or a CPF and picks the payer from what comes
  // back. Two controls — a search box feeding a separate select — made them hunt twice for one
  // person.
  const [payerSearch, setPayerSearch] = useState('');
  const debouncedPayerSearch = useDebouncedValue(payerSearch);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [guardiansLoading, setGuardiansLoading] = useState(false);
  const [payer, setPayer] = useState<Guardian | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [contractId, setContractId] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    if (!schoolId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await listCharges({
        schoolId,
        page: page + 1,
        status: STATUS_FILTERS.find((option) => option.value === statusFilter)?.statuses,
        q: debouncedSearch || undefined,
      });
      setCharges(response.data);
      setTotal(response.meta.total);
    } catch (err) {
      setCharges([]);
      setTotal(0);
      setError(err instanceof ApiError ? err.message : t('charges.loadError'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, page, statusFilter, debouncedSearch, t]);

  useEffect(() => {
    load();
  }, [load]);

  // A different filter or term is a different list; staying on page 4 of it makes no sense.
  useEffect(() => {
    setPage(0);
  }, [statusFilter, debouncedSearch]);

  // Finding the payer by name or CPF is the first step of raising a one-off charge.
  useEffect(() => {
    if (!schoolId || !formOpen) {
      return;
    }

    let current = true;
    setGuardiansLoading(true);

    const searchGuardians = async () => {
      try {
        const response = await listGuardians({ schoolId, q: debouncedPayerSearch });
        if (current) {
          setGuardians(response.data);
        }
      } catch {
        if (current) {
          setGuardians([]);
        }
      } finally {
        if (current) {
          setGuardiansLoading(false);
        }
      }
    };

    searchGuardians();

    return () => {
      current = false;
    };
  }, [schoolId, formOpen, debouncedPayerSearch]);

  // Their contracts are what a charge can hang off; a payer with none can still be billed.
  useEffect(() => {
    if (!schoolId || !payer) {
      setContracts([]);
      return;
    }

    const loadContracts = async () => {
      try {
        const response = await listContracts({ schoolId, guardianId: payer.id });
        setContracts(response.data);
      } catch {
        setContracts([]);
      }
    };

    loadContracts();
  }, [schoolId, payer]);

  const openForm = () => {
    setPayerSearch('');
    setPayer(null);
    setContractId('');
    setAmount('');
    setDueDate('');
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

    // A contract is optional; a payer is not — the slip has to carry someone's CPF.
    if (!payer) {
      setFormError(t('charges.form.payerRequired'));
      return;
    }
    if (!cents) {
      setFormError(t('charges.form.amountRequired'));
      return;
    }
    if (!dueDate) {
      setFormError(t('charges.form.dueDateRequired'));
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      await createOneOffCharge(schoolId, {
        guardian_id: payer.id,
        contract_id: contractId ? Number(contractId) : null,
        total_amount_cents: cents,
        due_date: dueDate,
        description: description.trim() || null,
      });

      setFormOpen(false);
      load();
    } catch (err) {
      if (err instanceof ApiError) {
        const base = err.details.base;
        setFormError(Array.isArray(base) && typeof base[0] === 'string' ? base[0] : err.message);
      } else {
        setFormError(t('charges.form.error'));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!schoolId || !cancelling) {
      return;
    }

    setCancellingId(cancelling.id);
    setError('');

    try {
      await cancelCharge(schoolId, cancelling.id);
      setCancelling(null);
      setNotice(t('charges.cancelled'));
      load();
    } catch (err) {
      setCancelling(null);
      setError(err instanceof ApiError ? err.message : t('charges.cancelError'));
    } finally {
      setCancellingId(null);
    }
  };

  const columns: GridColDef<Charge>[] = [
    {
      field: 'kind',
      headerName: t('charges.column.type'),
      width: 110,
      renderCell: ({ value }: GridRenderCellParams<Charge, Charge['kind']>) => (
        <Typography variant="body2">{value === 'one_off' ? t('charges.kind.oneOff') : t('charges.kind.tuition')}</Typography>
      ),
    },
    {
      field: 'student',
      headerName: t('common.student'),
      flex: 1,
      minWidth: 160,
      sortable: false,
      renderCell: ({ row }: GridRenderCellParams<Charge>) =>
        row.student ? (
          <Typography variant="body2">{row.student.name}</Typography>
        ) : (
          // A one-off raised outside any contract answers to no student.
          <Typography variant="body2" color="text.secondary">
            —
          </Typography>
        ),
    },
    {
      field: 'guardian',
      headerName: t('charges.column.billedTo'),
      flex: 1,
      minWidth: 190,
      sortable: false,
      renderCell: ({ row }: GridRenderCellParams<Charge>) => (
        <Stack direction="column" justifyContent="center" py={1}>
          <Typography variant="body2">{row.guardian.name}</Typography>
          <Typography variant="caption" color="text.secondary">
            CPF {formatCpf(row.guardian.cpf)}
          </Typography>
        </Stack>
      ),
    },
    {
      field: 'description',
      headerName: t('common.description'),
      flex: 1,
      minWidth: 160,
      renderCell: ({ value }: GridRenderCellParams<Charge, string | null>) =>
        value ? (
          <Typography variant="body2">{value}</Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">
            —
          </Typography>
        ),
    },
    {
      field: 'total_amount_cents',
      headerName: t('common.amount'),
      width: 130,
      renderCell: ({ value }: GridRenderCellParams<Charge, number>) => (
        <Typography variant="body2">{formatCents(value)}</Typography>
      ),
    },
    {
      field: 'due_date',
      headerName: t('charges.column.due'),
      width: 120,
      renderCell: ({ value }: GridRenderCellParams<Charge, string | null>) => (
        <Typography variant="body2">{formatDate(value ?? null, locale)}</Typography>
      ),
    },
    {
      field: 'status',
      headerName: t('common.status'),
      width: 120,
      renderCell: ({ value }: GridRenderCellParams<Charge, Charge['status']>) => (
        <SemanticChip
          variant={STATUS_VARIANTS[value ?? 'pending']}
          label={t(STATUS_KEYS[value ?? 'pending'])}
        />
      ),
    },
    {
      field: 'boleto_url',
      headerName: t('charges.column.boleto'),
      width: 100,
      sortable: false,
      renderCell: ({ value, row }: GridRenderCellParams<Charge, string | null>) =>
        value && row.status !== 'cancelled' ? (
          // `component="a"` opts out of the theme's default, which routes every MuiLink through
          // react-router; this points at the bank, not at an in-app route.
          <Link component="a" href={value} target="_blank" rel="noopener" variant="body2">
            {t('charges.open')}
          </Link>
        ) : (
          <Typography variant="body2" color="text.secondary">
            —
          </Typography>
        ),
    },
    {
      field: 'actions',
      headerName: t('common.actions'),
      width: 90,
      sortable: false,
      filterable: false,
      align: 'right',
      headerAlign: 'right',
      renderCell: ({ row }: GridRenderCellParams<Charge>) => (
        <Stack direction="row" justifyContent="flex-end" height={1}>
          {/* Only a live boleto can be withdrawn; a paid or already cancelled one has nothing
              left to cancel. */}
          {(row.status === 'pending' || row.status === 'overdue') && (
            <Tooltip title={t('common.cancel')}>
              <IconButton
                size="small"
                aria-label={t('charges.cancelAction', { name: row.guardian.name })}
                onClick={() => setCancelling(row)}
                disabled={cancellingId === row.id}
              >
                <IconifyIcon icon="mingcute:close-circle-line" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      ),
    },
  ];

  if (!school) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title={t('charges.title')} />
        <SectionCard>
          <EmptyState
            title={t('charges.noAccess.title')}
            description={t('charges.noAccess.description')}
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader
        title={t('charges.title')}
        subtitle={school.school_name ?? undefined}
        actions={
          <>
            <TextField
              id="charge-status-filter"
              label={t('common.status')}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              select
              size="small"
              variant="filled"
              sx={{ width: 150 }}
            >
              {STATUS_FILTERS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {t(option.label)}
                </MenuItem>
              ))}
            </TextField>
            <SearchField
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('charges.searchPlaceholder')}
              ariaLabel={t('charges.searchLabel')}
              sx={{ width: 260 }}
            />
            <Button variant="outlined" size="small" onClick={() => setBatchOpen(true)}>
              {t('charges.issueInBulk')}
            </Button>
            <Button variant="contained" size="small" onClick={openForm}>
              {t('charges.newOneOff')}
            </Button>
          </>
        }
      />

      {error && <ErrorBanner message={error} />}
      {notice && <Alert severity="success">{notice}</Alert>}

      <SectionCard padding={0}>
        {!loading && charges.length === 0 && !error ? (
          <EmptyState
            title={debouncedSearch || statusFilter !== 'all' ? t('charges.emptySearch.title') : t('charges.empty.title')}
            description={
              debouncedSearch || statusFilter !== 'all'
                ? t('charges.emptySearch.description')
                : t('charges.empty.description')
            }
            action={
              <Button variant="contained" size="small" onClick={openForm}>
                {t('charges.newOneOff')}
              </Button>
            }
          />
        ) : (
          <Box px={3.5} py={3.5} sx={{ height: 594, width: 1 }}>
            <DataTable
              rows={charges}
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
            />
          </Box>
        )}
      </SectionCard>

      <Dialog
        open={formOpen}
        onClose={saving ? undefined : () => setFormOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('charges.form.title')}</DialogTitle>
        <Stack component="form" onSubmit={handleSubmit} direction="column" noValidate>
          <DialogContent>
            <Grid container spacing={2.5} pt={0.5}>
              <Grid size={12}>
                {/* Type part of a name or a CPF and pick from what comes back — one field for
                    what used to be a search box and a separate select. */}
                <Autocomplete
                  id="charge-payer"
                  options={guardians}
                  value={payer}
                  onChange={(_, option) => {
                    setPayer(option);
                    setContractId('');
                  }}
                  onInputChange={(_, term) => setPayerSearch(term)}
                  getOptionLabel={guardianLabel}
                  isOptionEqualToValue={(option, selected) => option.id === selected.id}
                  // The API already matched the term against name and CPF; filtering again here
                  // would drop rows it deliberately returned.
                  filterOptions={(options) => options}
                  loading={guardiansLoading}
                  noOptionsText={payerSearch ? t('charges.form.noGuardianFound') : t('charges.form.typeToSearch')}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t('charges.form.payer')}
                      variant="filled"
                      required
                      helperText={
                        payer
                          ? t('charges.form.payerCpf', { cpf: formatCpf(payer.cpf) })
                          : t('charges.form.payerHelp')
                      }
                    />
                  )}
                />
              </Grid>
              <Grid size={12}>
                {/* Optional: a school also bills for what nobody signed a contract about. When
                    one is named the charge shows up in that student's history. */}
                <TextField
                  id="charge-contract"
                  label={t('charges.form.contract')}
                  value={contractId}
                  onChange={(e) => setContractId(e.target.value)}
                  variant="filled"
                  select
                  fullWidth
                  disabled={!payer}
                  helperText={
                    payer && contracts.length === 0
                      ? t('charges.form.noContractHelp')
                      : ' '
                  }
                >
                  <MenuItem value="">{t('charges.form.noContract')}</MenuItem>
                  {contracts.map((contract) => (
                    <MenuItem key={contract.id} value={String(contract.id)}>
                      {t('charges.form.contractOption', {
                        student: contract.student_name ?? `#${contract.id}`,
                        amount: formatCents(contract.negotiated_amount_cents),
                      })}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  id="charge-amount"
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
                  id="charge-due-date"
                  label={t('charges.form.dueDate')}
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  variant="filled"
                  fullWidth
                  required
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  id="charge-description"
                  label={t('common.description')}
                  placeholder={t('charges.form.descriptionPlaceholder')}
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
              {saving ? t('charges.form.submitting') : t('charges.form.submit')}
            </Button>
          </DialogActions>
        </Stack>
      </Dialog>

      <ConfirmDialog
        open={cancelling !== null}
        title={t('charges.cancelTitle')}
        message={
          cancelling
            ? t('charges.cancelMessage', {
                name: cancelling.guardian.name,
                amount: formatCents(cancelling.total_amount_cents),
              })
            : ''
        }
        destructive
        confirmLabel={t('charges.cancelConfirm')}
        cancelLabel={t('charges.cancelKeep')}
        onConfirm={handleCancel}
        onCancel={() => setCancelling(null)}
      />

      {schoolId && (
        <ChargeBatchDialog
          open={batchOpen}
          schoolId={schoolId}
          onClose={() => setBatchOpen(false)}
          onIssued={(result) => {
            const skipped = result.skipped_contract_ids.length;
            const withoutPayer = result.contract_ids_without_payer.length;

            setNotice(
              [
                t('charges.batch.issued', { count: result.created_count }),
                skipped > 0 ? t('charges.batch.skipped', { count: skipped }) : '',
                withoutPayer > 0 ? t('charges.batch.withoutPayer', { count: withoutPayer }) : '',
              ]
                .filter(Boolean)
                .join(' '),
            );
            setPage(0);
            load();
          }}
        />
      )}
    </Stack>
  );
};

export default Charges;
