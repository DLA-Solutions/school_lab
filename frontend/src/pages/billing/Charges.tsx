import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from 'react';
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
import Typography from '@mui/material/Typography';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  DataTable,
  EmptyState,
  ErrorBanner,
  PageHeader,
  SearchField,
  SectionCard,
  SemanticChip,
} from 'design-system';
import { useCurrentSchool } from 'providers/useCurrentSchool';
import { ApiError } from 'services/api';
import { createOneOffCharge, listCharges } from 'services/chargesApi';
import { listContracts } from 'services/contractsApi';
import { listGuardians } from 'services/guardiansApi';
import { Charge } from 'types/charge';
import { Contract } from 'types/contract';
import { Guardian } from 'types/guardian';
import { formatCpf } from 'utils/documentNumber';
import { formatCents, formatCentsInput, parseCents } from 'utils/money';
import { useDebouncedValue } from 'utils/useDebouncedValue';

const PAGE_SIZE = 25;

const STATUS_LABELS: Record<Charge['status'], string> = {
  pending: 'Em aberto',
  overdue: 'Vencido',
  paid: 'Pago',
  cancelled: 'Cancelado',
};

const STATUS_VARIANTS: Record<Charge['status'], 'success' | 'warning' | 'error' | 'info'> = {
  pending: 'warning',
  overdue: 'error',
  paid: 'success',
  cancelled: 'info',
};

const formatDate = (value: string | null) => {
  if (!value) {
    return '—';
  }

  // Split rather than `new Date`: a bare ISO date parsed as UTC shows the day before here.
  const [year, month, day] = value.split('-');

  return `${day}/${month}/${year}`;
};

/**
 * The school's boletos. Beyond listing what the monthly schedule produced, this is where a
 * one-off charge is raised — always against the guardian who answers for the contract, so the
 * slip carries the CPF the family already knows.
 */
const Charges = () => {
  const school = useCurrentSchool();
  const schoolId = school?.school_id ?? null;

  const [charges, setCharges] = useState<Charge[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [guardianSearch, setGuardianSearch] = useState('');
  const debouncedGuardianSearch = useDebouncedValue(guardianSearch);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [guardianId, setGuardianId] = useState('');
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
      const response = await listCharges({ schoolId, page: page + 1 });
      setCharges(response.data);
      setTotal(response.meta.total);
    } catch (err) {
      setCharges([]);
      setTotal(0);
      setError(err instanceof ApiError ? err.message : 'Não foi possível carregar os boletos.');
    } finally {
      setLoading(false);
    }
  }, [schoolId, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Finding the payer by name or CPF is the first step of raising a one-off charge.
  useEffect(() => {
    if (!schoolId || !formOpen) {
      return;
    }

    const search = async () => {
      try {
        const response = await listGuardians({ schoolId, q: debouncedGuardianSearch });
        setGuardians(response.data);
      } catch {
        setGuardians([]);
      }
    };

    search();
  }, [schoolId, formOpen, debouncedGuardianSearch]);

  // Their contracts are what a charge can hang off; a guardian with none cannot be billed.
  useEffect(() => {
    if (!schoolId || !guardianId) {
      setContracts([]);
      return;
    }

    const loadContracts = async () => {
      try {
        const response = await listContracts({ schoolId, guardianId: Number(guardianId) });
        setContracts(response.data);
      } catch {
        setContracts([]);
      }
    };

    loadContracts();
  }, [schoolId, guardianId]);

  const openForm = () => {
    setGuardianSearch('');
    setGuardianId('');
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

    if (!contractId) {
      setFormError('Selecione o responsável e o contrato.');
      return;
    }
    if (!cents) {
      setFormError('Informe o valor do boleto.');
      return;
    }
    if (!dueDate) {
      setFormError('Informe a data de vencimento.');
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      await createOneOffCharge(schoolId, {
        contract_id: Number(contractId),
        total_amount_cents: cents,
        due_date: dueDate,
        description: description.trim() || null,
      });

      setFormOpen(false);
      load();
    } catch (err) {
      if (err instanceof ApiError) {
        const base = err.details.base;
        setFormError(
          Array.isArray(base) && typeof base[0] === 'string' ? base[0] : err.message,
        );
      } else {
        setFormError('Não foi possível gerar o boleto. Verifique sua conexão.');
      }
    } finally {
      setSaving(false);
    }
  };

  const columns: GridColDef<Charge>[] = [
    {
      field: 'kind',
      headerName: 'Tipo',
      width: 110,
      renderCell: ({ value }: GridRenderCellParams<Charge, Charge['kind']>) => (
        <Typography variant="body2">{value === 'one_off' ? 'Avulso' : 'Mensalidade'}</Typography>
      ),
    },
    {
      field: 'student',
      headerName: 'Aluno',
      flex: 1,
      minWidth: 160,
      sortable: false,
      renderCell: ({ row }: GridRenderCellParams<Charge>) => (
        <Typography variant="body2">{row.student.name}</Typography>
      ),
    },
    {
      field: 'guardian',
      headerName: 'Recebe o boleto',
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
      headerName: 'Descrição',
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
      headerName: 'Valor',
      width: 130,
      renderCell: ({ value }: GridRenderCellParams<Charge, number>) => (
        <Typography variant="body2">{formatCents(value)}</Typography>
      ),
    },
    {
      field: 'due_date',
      headerName: 'Vencimento',
      width: 130,
      renderCell: ({ value }: GridRenderCellParams<Charge, string | null>) => (
        <Typography variant="body2">{formatDate(value ?? null)}</Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'Situação',
      width: 130,
      renderCell: ({ value }: GridRenderCellParams<Charge, Charge['status']>) => (
        <SemanticChip variant={STATUS_VARIANTS[value ?? 'pending']} label={STATUS_LABELS[value ?? 'pending']} />
      ),
    },
    {
      field: 'boleto_url',
      headerName: 'Boleto',
      width: 110,
      sortable: false,
      renderCell: ({ value }: GridRenderCellParams<Charge, string | null>) =>
        value ? (
          // `component="a"` opts out of the theme's default, which routes every MuiLink through
          // react-router; this points at the bank, not at an in-app route.
          <Link component="a" href={value} target="_blank" rel="noopener" variant="body2">
            Abrir
          </Link>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Não emitido
          </Typography>
        ),
    },
  ];

  if (!school) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title="Boletos" />
        <SectionCard>
          <EmptyState
            title="Sem acesso a esta área"
            description="Os boletos estão disponíveis apenas para usuários com vínculo ativo de escola."
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  const selectedGuardian = guardians.find((option) => String(option.id) === guardianId);

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader
        title="Boletos"
        actions={
          <Button variant="contained" size="small" onClick={openForm}>
            Novo boleto avulso
          </Button>
        }
      />

      {error && <ErrorBanner message={error} />}

      <SectionCard padding={0}>
        {!loading && charges.length === 0 && !error ? (
          <EmptyState
            title="Nenhum boleto emitido"
            description="Os boletos das mensalidades aparecem aqui, junto com os avulsos que você gerar."
            action={
              <Button variant="contained" size="small" onClick={openForm}>
                Novo boleto avulso
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
              rangeLabel={({ from, to, count }) => `${from}-${to} de ${count}`}
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
        <DialogTitle>Novo boleto avulso</DialogTitle>
        <Stack component="form" onSubmit={handleSubmit} direction="column" noValidate>
          <DialogContent>
            <Grid container spacing={2.5} pt={0.5}>
              <Grid size={12}>
                <SearchField
                  value={guardianSearch}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setGuardianSearch(e.target.value)}
                  placeholder="Buscar responsável por nome ou CPF"
                  ariaLabel="Buscar responsável"
                  fullWidth
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  id="charge-guardian"
                  label="Responsável"
                  value={guardianId}
                  onChange={(e) => {
                    setGuardianId(e.target.value);
                    setContractId('');
                  }}
                  variant="filled"
                  select
                  fullWidth
                  required
                >
                  {guardians.map((option) => (
                    <MenuItem key={option.id} value={String(option.id)}>
                      {`${option.name} — CPF ${formatCpf(option.cpf)}`}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={12}>
                {/* A charge hangs off a contract; the API bills whoever answers for it. */}
                <TextField
                  id="charge-contract"
                  label="Contrato"
                  value={contractId}
                  onChange={(e) => setContractId(e.target.value)}
                  variant="filled"
                  select
                  fullWidth
                  required
                  disabled={!guardianId}
                  helperText={
                    guardianId && contracts.length === 0
                      ? 'Este responsável não tem contrato. Emita um contrato antes de cobrar.'
                      : selectedGuardian
                        ? `O boleto sairá no CPF ${formatCpf(selectedGuardian.cpf)}.`
                        : ' '
                  }
                >
                  {contracts.map((contract) => (
                    <MenuItem key={contract.id} value={String(contract.id)}>
                      {`${contract.student_name ?? `Contrato ${contract.id}`} — ${formatCents(
                        contract.negotiated_amount_cents,
                      )}/mês`}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  id="charge-amount"
                  label="Valor"
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
                  label="Vencimento"
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
                  label="Descrição"
                  placeholder="Excursão pedagógica, segunda via de uniforme..."
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
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={saving}
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {saving ? 'Gerando...' : 'Gerar boleto'}
            </Button>
          </DialogActions>
        </Stack>
      </Dialog>
    </Stack>
  );
};

export default Charges;
