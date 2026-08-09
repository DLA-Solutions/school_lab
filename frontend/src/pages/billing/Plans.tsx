import { FormEvent, useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import IconifyIcon from 'components/base/IconifyIcon';
import {
  ConfirmDialog,
  DataTable,
  EmptyState,
  ErrorBanner,
  PageHeader,
  SectionCard,
} from 'design-system';
import { useCurrentSchool } from 'providers/useCurrentSchool';
import { ApiError } from 'services/api';
import {
  createBillingPlan,
  createPlanDiscount,
  deleteBillingPlan,
  deletePlanDiscount,
  listBillingPlans,
  listPlanDiscounts,
  provisionDefaultDiscounts,
  updateBillingPlan,
  updatePlanDiscount,
} from 'services/contractsApi';
import { BillingPlan, PlanDiscount } from 'types/contract';
import { formatCents, formatCentsInput, parseCents } from 'utils/money';

const renderAmount = ({ value }: GridRenderCellParams<BillingPlan, number | null>) => (
  <Typography variant="body2">{formatCents(value)}</Typography>
);

const renderPercent = ({ value }: GridRenderCellParams<PlanDiscount, number>) => (
  <Typography variant="body2">{value === 100 ? '100% (integral)' : `${value}%`}</Typography>
);

/**
 * Where a school states what it charges: the full tuition of each plan, and the bands it grants
 * against them. A contract picks one of each, so the amount a family pays is explainable rather
 * than typed in by hand every time.
 */
const Plans = () => {
  const school = useCurrentSchool();
  const schoolId = school?.school_id ?? null;

  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [discounts, setDiscounts] = useState<PlanDiscount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [provisioning, setProvisioning] = useState(false);

  const [planForm, setPlanForm] = useState<{ open: boolean; editing: BillingPlan | null }>({
    open: false,
    editing: null,
  });
  const [planName, setPlanName] = useState('');
  const [planAmount, setPlanAmount] = useState('');
  const [planError, setPlanError] = useState('');

  const [discountForm, setDiscountForm] = useState<{ open: boolean; editing: PlanDiscount | null }>({
    open: false,
    editing: null,
  });
  const [discountName, setDiscountName] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [discountError, setDiscountError] = useState('');

  const [saving, setSaving] = useState(false);
  const [pendingPlanDelete, setPendingPlanDelete] = useState<BillingPlan | null>(null);
  const [pendingDiscountDelete, setPendingDiscountDelete] = useState<PlanDiscount | null>(null);

  const load = useCallback(async () => {
    if (!schoolId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [planList, discountList] = await Promise.all([
        listBillingPlans(schoolId),
        listPlanDiscounts(schoolId),
      ]);
      setPlans(planList.data);
      setDiscounts(discountList.data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Não foi possível carregar os planos.',
      );
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    load();
  }, [load]);

  const openPlanForm = (plan: BillingPlan | null) => {
    setPlanForm({ open: true, editing: plan });
    setPlanName(plan?.name ?? '');
    setPlanAmount(plan?.base_amount_cents ? formatCentsInput(String(plan.base_amount_cents)) : '');
    setPlanError('');
  };

  const submitPlan = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!schoolId) {
      return;
    }

    const cents = parseCents(planAmount);
    if (!planName.trim()) {
      setPlanError('Informe o nome do plano.');
      return;
    }
    if (!cents) {
      setPlanError('Informe o valor cheio da mensalidade.');
      return;
    }

    setSaving(true);

    try {
      if (planForm.editing) {
        await updateBillingPlan(schoolId, planForm.editing.id, {
          name: planName.trim(),
          base_amount_cents: cents,
        });
      } else {
        await createBillingPlan(schoolId, {
          name: planName.trim(),
          base_amount_cents: cents,
          plan_type: 'tuition',
        });
      }

      setPlanForm({ open: false, editing: null });
      load();
    } catch (err) {
      setPlanError(err instanceof ApiError ? err.message : 'Não foi possível salvar o plano.');
    } finally {
      setSaving(false);
    }
  };

  const openDiscountForm = (discount: PlanDiscount | null) => {
    setDiscountForm({ open: true, editing: discount });
    setDiscountName(discount?.name ?? '');
    setDiscountPercent(discount ? String(discount.percent) : '');
    setDiscountError('');
  };

  const submitDiscount = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!schoolId) {
      return;
    }

    const percent = Number(discountPercent);
    if (!discountName.trim()) {
      setDiscountError('Informe o nome do desconto.');
      return;
    }
    if (Number.isNaN(percent) || percent < 0 || percent > 100) {
      setDiscountError('O percentual deve estar entre 0 e 100.');
      return;
    }

    setSaving(true);

    try {
      if (discountForm.editing) {
        await updatePlanDiscount(schoolId, discountForm.editing.id, {
          name: discountName.trim(),
          percent,
        });
      } else {
        await createPlanDiscount(schoolId, { name: discountName.trim(), percent });
      }

      setDiscountForm({ open: false, editing: null });
      load();
    } catch (err) {
      if (err instanceof ApiError) {
        const detail = err.details.name ?? err.details.percent;
        setDiscountError(
          Array.isArray(detail) && typeof detail[0] === 'string' ? detail[0] : err.message,
        );
      } else {
        setDiscountError('Não foi possível salvar o desconto.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleProvisionDefaults = async () => {
    if (!schoolId) {
      return;
    }

    setProvisioning(true);
    setError('');

    try {
      await provisionDefaultDiscounts(schoolId);
      load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Não foi possível criar os descontos padrão.',
      );
    } finally {
      setProvisioning(false);
    }
  };

  const confirmDelete = async (kind: 'plan' | 'discount') => {
    if (!schoolId) {
      return;
    }

    try {
      if (kind === 'plan' && pendingPlanDelete) {
        await deleteBillingPlan(schoolId, pendingPlanDelete.id);
      }
      if (kind === 'discount' && pendingDiscountDelete) {
        await deletePlanDiscount(schoolId, pendingDiscountDelete.id);
      }
      load();
    } catch (err) {
      // The API refuses to remove a band still granted on a contract, and says how many.
      if (err instanceof ApiError) {
        const base = err.details.base;
        setError(Array.isArray(base) && typeof base[0] === 'string' ? base[0] : err.message);
      } else {
        setError('Não foi possível excluir.');
      }
    } finally {
      setPendingPlanDelete(null);
      setPendingDiscountDelete(null);
    }
  };

  const planColumns: GridColDef<BillingPlan>[] = [
    { field: 'name', headerName: 'Plano', flex: 1, minWidth: 220 },
    {
      field: 'base_amount_cents',
      headerName: 'Valor cheio',
      width: 160,
      renderCell: renderAmount,
    },
    {
      field: 'actions',
      headerName: 'Ações',
      width: 110,
      sortable: false,
      filterable: false,
      align: 'right',
      headerAlign: 'right',
      renderCell: ({ row }: GridRenderCellParams<BillingPlan>) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end" height={1}>
          <Tooltip title="Editar">
            <IconButton
              size="small"
              aria-label={`Editar plano ${row.name}`}
              onClick={() => openPlanForm(row)}
            >
              <IconifyIcon icon="mingcute:edit-2-line" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Excluir">
            <IconButton
              size="small"
              aria-label={`Excluir plano ${row.name}`}
              onClick={() => setPendingPlanDelete(row)}
            >
              <IconifyIcon icon="mingcute:delete-2-line" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  const discountColumns: GridColDef<PlanDiscount>[] = [
    { field: 'name', headerName: 'Desconto', flex: 1, minWidth: 200 },
    { field: 'percent', headerName: 'Percentual', width: 150, renderCell: renderPercent },
    {
      field: 'actions',
      headerName: 'Ações',
      width: 110,
      sortable: false,
      filterable: false,
      align: 'right',
      headerAlign: 'right',
      renderCell: ({ row }: GridRenderCellParams<PlanDiscount>) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end" height={1}>
          <Tooltip title="Editar">
            <IconButton
              size="small"
              aria-label={`Editar desconto ${row.name}`}
              onClick={() => openDiscountForm(row)}
            >
              <IconifyIcon icon="mingcute:edit-2-line" />
            </IconButton>
          </Tooltip>
          {/* Removal is refused while a contract still points at the band. */}
          <Tooltip title={row.in_use ? 'Aplicado em contratos — não pode ser removido' : 'Excluir'}>
            <span>
              <IconButton
                size="small"
                aria-label={`Excluir desconto ${row.name}`}
                onClick={() => setPendingDiscountDelete(row)}
                disabled={row.in_use}
              >
                <IconifyIcon icon="mingcute:delete-2-line" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  if (!school) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title="Planos" />
        <SectionCard>
          <EmptyState
            title="Sem acesso a esta área"
            description="Os planos estão disponíveis apenas para usuários com vínculo ativo de escola."
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader title="Planos" subtitle="Valor cheio da mensalidade e descontos concedidos" />

      {error && <ErrorBanner message={error} />}

      <SectionCard
        title="Planos"
        padding={0}
        headerActions={
          <Button variant="contained" size="small" onClick={() => openPlanForm(null)}>
            Novo plano
          </Button>
        }
      >
        {!loading && plans.length === 0 ? (
          <EmptyState
            title="Nenhum plano cadastrado"
            description="Cadastre o valor cheio da mensalidade para poder emitir contratos."
            action={
              <Button variant="contained" size="small" onClick={() => openPlanForm(null)}>
                Novo plano
              </Button>
            }
          />
        ) : (
          <Box px={3.5} pb={3.5} sx={{ height: 340, width: 1 }}>
            <DataTable
              rows={plans}
              columns={planColumns}
              loading={loading}
              disableRowSelectionOnClick
              hideFooter
            />
          </Box>
        )}
      </SectionCard>

      <SectionCard
        title="Descontos"
        padding={0}
        headerActions={
          <>
            <Button
              variant="text"
              size="small"
              onClick={handleProvisionDefaults}
              disabled={provisioning}
              startIcon={provisioning ? <CircularProgress size={14} /> : null}
            >
              Descontos padrão
            </Button>
            <Button variant="contained" size="small" onClick={() => openDiscountForm(null)}>
              Novo desconto
            </Button>
          </>
        }
      >
        {!loading && discounts.length === 0 ? (
          <EmptyState
            title="Nenhum desconto cadastrado"
            description="Comece pelas faixas padrão (10%, 20%, 30%, 40% e bolsa integral) ou crie a sua."
            action={
              <Button
                variant="contained"
                size="small"
                onClick={handleProvisionDefaults}
                disabled={provisioning}
              >
                {provisioning ? 'Criando...' : 'Criar descontos padrão'}
              </Button>
            }
          />
        ) : (
          <Box px={3.5} pb={3.5} sx={{ height: 400, width: 1 }}>
            <DataTable
              rows={discounts}
              columns={discountColumns}
              loading={loading}
              disableRowSelectionOnClick
              hideFooter
            />
          </Box>
        )}
      </SectionCard>

      <Dialog
        open={planForm.open}
        onClose={saving ? undefined : () => setPlanForm({ open: false, editing: null })}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{planForm.editing ? 'Editar plano' : 'Novo plano'}</DialogTitle>
        <Stack component="form" onSubmit={submitPlan} direction="column" noValidate>
          <DialogContent>
            <Grid container spacing={2.5} pt={0.5}>
              <Grid size={12}>
                <TextField
                  id="plan-name"
                  label="Nome do plano"
                  placeholder="Educação Infantil, Ensino Fundamental..."
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  variant="filled"
                  fullWidth
                  autoFocus
                  required
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  id="plan-amount"
                  label="Valor cheio da mensalidade"
                  value={planAmount}
                  onChange={(e) => setPlanAmount(formatCentsInput(e.target.value))}
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
              {planError && (
                <Grid size={12}>
                  <ErrorBanner message={planError} />
                </Grid>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setPlanForm({ open: false, editing: null })}
              color="inherit"
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogActions>
        </Stack>
      </Dialog>

      <Dialog
        open={discountForm.open}
        onClose={saving ? undefined : () => setDiscountForm({ open: false, editing: null })}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{discountForm.editing ? 'Editar desconto' : 'Novo desconto'}</DialogTitle>
        <Stack component="form" onSubmit={submitDiscount} direction="column" noValidate>
          <DialogContent>
            <Grid container spacing={2.5} pt={0.5}>
              <Grid size={12}>
                <TextField
                  id="discount-name"
                  label="Nome"
                  placeholder="Desconto 15%, Bolsa parcial..."
                  value={discountName}
                  onChange={(e) => setDiscountName(e.target.value)}
                  variant="filled"
                  fullWidth
                  autoFocus
                  required
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  id="discount-percent"
                  label="Percentual"
                  type="number"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  variant="filled"
                  fullWidth
                  required
                  helperText="100% equivale a bolsa integral."
                  slotProps={{
                    input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
                    htmlInput: { min: 0, max: 100, step: 1 },
                  }}
                />
              </Grid>
              {discountError && (
                <Grid size={12}>
                  <ErrorBanner message={discountError} />
                </Grid>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setDiscountForm({ open: false, editing: null })}
              color="inherit"
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogActions>
        </Stack>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingPlanDelete)}
        title="Excluir plano"
        message={`Excluir ${pendingPlanDelete?.name ?? ''}? Ele deixa de aparecer ao emitir contratos.`}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        destructive
        onConfirm={() => confirmDelete('plan')}
        onCancel={() => setPendingPlanDelete(null)}
      />

      <ConfirmDialog
        open={Boolean(pendingDiscountDelete)}
        title="Excluir desconto"
        message={`Excluir ${pendingDiscountDelete?.name ?? ''}? Ele deixa de aparecer ao emitir contratos.`}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        destructive
        onConfirm={() => confirmDelete('discount')}
        onCancel={() => setPendingDiscountDelete(null)}
      />
    </Stack>
  );
};

export default Plans;
