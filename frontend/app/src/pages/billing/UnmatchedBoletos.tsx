import { FormEvent, useCallback, useEffect, useState } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  ConfirmDialog,
  DataTable,
  EmptyState,
  ErrorBanner,
  InfoBanner,
  PageHeader,
  SectionCard,
  SemanticChip,
  SuccessBanner,
} from 'design-system';
import { useCurrentSchool } from 'providers/useCurrentSchool';
import { ApiError } from 'services/api';
import {
  dismissUnmatchedBoleto,
  listUnmatchedBoletos,
  resolveUnmatchedBoleto,
} from 'services/chargesApi';
import { listGuardians } from 'services/guardiansApi';
import { UnmatchedBoleto, UnmatchedBoletoStatus } from 'types/charge';
import { Guardian } from 'types/guardian';
import { formatCpf } from 'utils/documentNumber';
import { formatCents } from 'utils/money';
import { useDebouncedValue } from 'utils/useDebouncedValue';
import { useTranslation } from 'providers/I18nContext';
import type { MessageKey } from 'locales';

const PAGE_SIZE = 25;

const STATUS_FILTERS: { value: UnmatchedBoletoStatus; label: MessageKey }[] = [
  { value: 'pending', label: 'charges.unmatched.filter.pending' },
  { value: 'resolved', label: 'charges.unmatched.filter.resolved' },
  { value: 'dismissed', label: 'charges.unmatched.filter.dismissed' },
];

const PROVIDER_STATUS_KEYS: Record<UnmatchedBoleto['provider_status'], MessageKey> = {
  draft: 'charges.unmatched.providerStatus.draft',
  open: 'charges.unmatched.providerStatus.open',
  paid: 'charges.unmatched.providerStatus.paid',
  late: 'charges.unmatched.providerStatus.late',
  cancelled: 'charges.unmatched.providerStatus.cancelled',
};

const PROVIDER_STATUS_VARIANTS: Record<UnmatchedBoleto['provider_status'], 'success' | 'warning' | 'error' | 'info'> = {
  draft: 'info',
  open: 'warning',
  paid: 'success',
  late: 'error',
  cancelled: 'info',
};

const STATUS_KEYS: Record<UnmatchedBoletoStatus, MessageKey> = {
  pending: 'charges.unmatched.status.pending',
  resolved: 'charges.unmatched.status.resolved',
  dismissed: 'charges.unmatched.status.dismissed',
};

const STATUS_VARIANTS: Record<UnmatchedBoletoStatus, 'success' | 'warning' | 'error' | 'info'> = {
  pending: 'warning',
  resolved: 'success',
  dismissed: 'info',
};

/**
 * Split rather than `new Date`: a bare ISO date parsed as UTC shows the day before here. Mirrors
 * `Charges.tsx`'s own `formatDate` — same reasoning, kept local rather than shared until a third
 * screen needs it.
 */
const formatDate = (value: string | null, locale: string) => {
  if (!value) {
    return '—';
  }

  const [year, month, day] = value.split('-');

  return locale === 'en-US' ? `${month}/${day}/${year}` : `${day}/${month}/${year}`;
};

/** Name and CPF in one line — how a payer is recognised in a list of them. */
const guardianLabel = (guardian: Guardian) => `${guardian.name} — ${formatCpf(guardian.cpf)}`;

/** What the bank reported, formatted the same way a guardian's own CPF is shown. */
const payerLabel = (row: UnmatchedBoleto) => row.payer_name || formatCpf(row.payer_cpf);

/**
 * The staff review queue for boletos the school created directly in Banco Inter's own dashboard
 * (bypassing the platform): imported by `Billing::ImportExternalBoletosService`, but whose payer
 * CPF matched no guardian on file here. Staff either link the row to the right guardian — which
 * creates its migrated `Charge` in that family's history — or dismiss it, e.g. a test boleto or
 * one that never belonged to this school.
 *
 * Not a daily list: defaults to the open (`pending`) queue, with a secondary filter to browse
 * what was already linked or dismissed.
 */
const UnmatchedBoletos = () => {
  const { t, locale } = useTranslation();
  const school = useCurrentSchool();
  const schoolId = school?.school_id ?? null;

  const [rows, setRows] = useState<UnmatchedBoleto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [statusFilter, setStatusFilter] = useState<UnmatchedBoletoStatus>('pending');

  const [resolving, setResolving] = useState<UnmatchedBoleto | null>(null);
  const [guardianSearch, setGuardianSearch] = useState('');
  const debouncedGuardianSearch = useDebouncedValue(guardianSearch);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [guardiansLoading, setGuardiansLoading] = useState(false);
  const [selectedGuardian, setSelectedGuardian] = useState<Guardian | null>(null);
  const [resolveError, setResolveError] = useState('');
  const [resolveSaving, setResolveSaving] = useState(false);

  const [dismissing, setDismissing] = useState<UnmatchedBoleto | null>(null);
  const [dismissSaving, setDismissSaving] = useState(false);

  const load = useCallback(async () => {
    if (!schoolId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await listUnmatchedBoletos({ schoolId, status: statusFilter, page: page + 1 });
      setRows(response.data);
      setTotal(response.meta.total);
    } catch (err) {
      setRows([]);
      setTotal(0);
      setError(err instanceof ApiError ? err.message : t('charges.unmatched.loadError'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, statusFilter, page, t]);

  useEffect(() => {
    load();
  }, [load]);

  // A different filter is a different list; staying on page 4 of it makes no sense.
  useEffect(() => {
    setPage(0);
  }, [statusFilter]);

  // Finding the right guardian for the resolve dialog — the same "type part of a name or a CPF"
  // search `Charges.tsx`'s one-off form uses for its payer field.
  useEffect(() => {
    if (!schoolId || !resolving) {
      return;
    }

    let current = true;
    setGuardiansLoading(true);

    const search = async () => {
      try {
        const response = await listGuardians({ schoolId, q: debouncedGuardianSearch });
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

    search();

    return () => {
      current = false;
    };
  }, [schoolId, resolving, debouncedGuardianSearch]);

  const openResolve = (row: UnmatchedBoleto) => {
    setResolving(row);
    setGuardianSearch('');
    setGuardians([]);
    setSelectedGuardian(null);
    setResolveError('');
  };

  const closeResolve = () => {
    if (resolveSaving) {
      return;
    }
    setResolving(null);
  };

  const handleResolve = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!schoolId || !resolving) {
      return;
    }

    if (!selectedGuardian) {
      setResolveError(t('charges.unmatched.resolveDialog.guardianRequired'));
      return;
    }

    setResolveSaving(true);
    setResolveError('');

    try {
      await resolveUnmatchedBoleto(schoolId, resolving.id, selectedGuardian.id);
      setResolving(null);
      setNotice(t('charges.unmatched.resolved', { name: selectedGuardian.name }));
      load();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // The dialog is closing, so the conflict has to read on the page behind it, not on a
        // banner inside a dialog that is about to unmount. `load()` itself clears the page error
        // on the way in, so it has to run and settle before this message is set, not before it.
        setResolving(null);
        await load();
        setError(t('charges.unmatched.dismissConflict'));
      } else if (err instanceof ApiError && err.status === 404) {
        setResolveError(t('charges.unmatched.resolveDialog.notFound'));
      } else {
        setResolveError(t('charges.unmatched.resolveDialog.error'));
      }
    } finally {
      setResolveSaving(false);
    }
  };

  const handleDismiss = async () => {
    if (!schoolId || !dismissing) {
      return;
    }

    setDismissSaving(true);
    setError('');

    try {
      await dismissUnmatchedBoleto(schoolId, dismissing.id);
      setDismissing(null);
      setNotice(t('charges.unmatched.dismissed'));
      load();
    } catch (err) {
      setDismissing(null);
      if (err instanceof ApiError && err.status === 409) {
        // Same ordering as the resolve flow: `load()` clears the page error on the way in, so it
        // has to settle before this message is set, not before it.
        await load();
        setError(t('charges.unmatched.dismissConflict'));
      } else {
        setError(err instanceof ApiError ? err.message : t('charges.unmatched.dismissError'));
      }
    } finally {
      setDismissSaving(false);
    }
  };

  const columns: GridColDef<UnmatchedBoleto>[] = [
    {
      field: 'payer_name',
      headerName: t('charges.unmatched.column.payer'),
      flex: 1,
      minWidth: 190,
      sortable: false,
      renderCell: ({ row }: GridRenderCellParams<UnmatchedBoleto>) => (
        <Stack direction="column" justifyContent="center" py={1}>
          <Typography variant="body2">{row.payer_name || '—'}</Typography>
          <Typography variant="caption" color="text.secondary">
            CPF {formatCpf(row.payer_cpf)}
          </Typography>
        </Stack>
      ),
    },
    {
      field: 'amount_cents',
      headerName: t('common.amount'),
      width: 140,
      renderCell: ({ value }: GridRenderCellParams<UnmatchedBoleto, number>) => (
        <Typography variant="body2">{formatCents(value ?? 0)}</Typography>
      ),
    },
    {
      field: 'due_date',
      headerName: t('charges.column.due'),
      width: 120,
      renderCell: ({ value }: GridRenderCellParams<UnmatchedBoleto, string | null>) => (
        <Typography variant="body2">{formatDate(value ?? null, locale)}</Typography>
      ),
    },
    {
      field: 'provider_status',
      headerName: t('charges.unmatched.column.bankStatus'),
      width: 150,
      renderCell: ({ value }: GridRenderCellParams<UnmatchedBoleto, UnmatchedBoleto['provider_status']>) => (
        <SemanticChip
          variant={PROVIDER_STATUS_VARIANTS[value ?? 'open']}
          label={t(PROVIDER_STATUS_KEYS[value ?? 'open'])}
        />
      ),
    },
    {
      field: 'status',
      headerName: t('common.status'),
      width: 130,
      renderCell: ({ value }: GridRenderCellParams<UnmatchedBoleto, UnmatchedBoletoStatus>) => (
        <SemanticChip variant={STATUS_VARIANTS[value ?? 'pending']} label={t(STATUS_KEYS[value ?? 'pending'])} />
      ),
    },
    {
      field: 'actions',
      headerName: t('common.actions'),
      width: 190,
      sortable: false,
      filterable: false,
      align: 'right',
      headerAlign: 'right',
      renderCell: ({ row }: GridRenderCellParams<UnmatchedBoleto>) =>
        row.status === 'pending' ? (
          <Stack direction="row" justifyContent="flex-end" gap={1} height={1}>
            <Button
              size="small"
              variant="outlined"
              aria-label={t('charges.unmatched.linkAction', { payer: payerLabel(row) })}
              onClick={() => openResolve(row)}
            >
              {t('charges.unmatched.link')}
            </Button>
            <Button
              size="small"
              color="error"
              aria-label={t('charges.unmatched.dismissAction', { payer: payerLabel(row) })}
              onClick={() => setDismissing(row)}
            >
              {t('charges.unmatched.dismiss')}
            </Button>
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            —
          </Typography>
        ),
    },
  ];

  if (!school) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title={t('charges.unmatched.title')} />
        <SectionCard>
          <EmptyState
            title={t('charges.unmatched.noAccess.title')}
            description={t('charges.unmatched.noAccess.description')}
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader
        title={t('charges.unmatched.title')}
        subtitle={school.school_name ?? undefined}
        actions={
          <TextField
            id="unmatched-boletos-status-filter"
            label={t('common.status')}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as UnmatchedBoletoStatus)}
            select
            size="small"
            variant="filled"
            sx={{ width: 160 }}
          >
            {STATUS_FILTERS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {t(option.label)}
              </MenuItem>
            ))}
          </TextField>
        }
      />

      <InfoBanner message={t('charges.unmatched.infoBanner')} />

      {error && <ErrorBanner message={error} onRetry={load} retryLabel={t('common.tryAgain')} />}
      {notice && <SuccessBanner message={notice} />}

      <SectionCard padding={0}>
        {!loading && rows.length === 0 && !error ? (
          <EmptyState
            title={
              statusFilter === 'pending'
                ? t('charges.unmatched.empty.title')
                : t('charges.unmatched.emptyFilter.title')
            }
            description={
              statusFilter === 'pending'
                ? t('charges.unmatched.empty.description')
                : t('charges.unmatched.emptyFilter.description')
            }
          />
        ) : (
          <Box px={3.5} py={3.5} sx={{ height: 594, width: 1 }}>
            <DataTable
              rows={rows}
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

      <Dialog open={resolving !== null} onClose={closeResolve} maxWidth="sm" fullWidth>
        <DialogTitle>{t('charges.unmatched.resolveDialog.title')}</DialogTitle>
        <Stack component="form" onSubmit={handleResolve} direction="column" noValidate>
          <DialogContent>
            <Stack direction="column" gap={2.5} pt={0.5}>
              <DialogContentText>{t('charges.unmatched.resolveDialog.description')}</DialogContentText>

              <Autocomplete
                id="unmatched-boleto-guardian"
                options={guardians}
                value={selectedGuardian}
                onChange={(_, option) => setSelectedGuardian(option)}
                onInputChange={(_, term) => setGuardianSearch(term)}
                getOptionLabel={guardianLabel}
                isOptionEqualToValue={(option, selected) => option.id === selected.id}
                // The API already matched the term against name and CPF; filtering again here
                // would drop rows it deliberately returned.
                filterOptions={(options) => options}
                loading={guardiansLoading}
                noOptionsText={
                  guardianSearch
                    ? t('charges.unmatched.resolveDialog.noGuardianFound')
                    : t('charges.unmatched.resolveDialog.typeToSearch')
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t('charges.unmatched.resolveDialog.guardianLabel')}
                    variant="filled"
                    required
                    helperText={
                      selectedGuardian
                        ? t('charges.unmatched.resolveDialog.guardianCpf', {
                            cpf: formatCpf(selectedGuardian.cpf),
                          })
                        : t('charges.unmatched.resolveDialog.guardianHelp')
                    }
                  />
                )}
              />

              {resolveError && <ErrorBanner message={resolveError} />}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeResolve} color="inherit" disabled={resolveSaving}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={resolveSaving}
              startIcon={resolveSaving ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {resolveSaving
                ? t('charges.unmatched.resolveDialog.submitting')
                : t('charges.unmatched.resolveDialog.submit')}
            </Button>
          </DialogActions>
        </Stack>
      </Dialog>

      <ConfirmDialog
        open={dismissing !== null}
        title={t('charges.unmatched.dismissTitle')}
        message={
          dismissing
            ? t('charges.unmatched.dismissMessage', {
                payer: payerLabel(dismissing),
                amount: formatCents(dismissing.amount_cents),
              })
            : ''
        }
        destructive
        confirmLabel={t('charges.unmatched.dismissConfirm')}
        cancelLabel={t('charges.unmatched.dismissCancel')}
        onConfirm={handleDismiss}
        onCancel={() => (dismissSaving ? undefined : setDismissing(null))}
      />
    </Stack>
  );
};

export default UnmatchedBoletos;
