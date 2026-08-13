import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
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
import { useTranslation } from 'providers/I18nContext';
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

const renderPercent = (
  { value }: GridRenderCellParams<PlanDiscount, number>,
  fullPercentLabel: string,
) => (
  <Typography variant="body2">
    {value === 100 ? fullPercentLabel : `${value}%`}
  </Typography>
);

const Plans = () => {
  const { t } = useTranslation();
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

  const [discountForm, setDiscountForm] = useState<{ open: boolean; editing: PlanDiscount | null }>(
    {
      open: false,
      editing: null,
    },
  );
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
      setError(err instanceof ApiError ? err.message : t('plans.loadError'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, t]);

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
      setPlanError(t('plans.planNameRequired'));
      return;
    }
    if (!cents) {
      setPlanError(t('plans.planAmountRequired'));
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
      setPlanError(err instanceof ApiError ? err.message : t('plans.planSaveError'));
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
      setDiscountError(t('plans.discountNameRequired'));
      return;
    }
    if (Number.isNaN(percent) || percent < 0 || percent > 100) {
      setDiscountError(t('plans.discountPercentInvalid'));
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
        setDiscountError(err instanceof ApiError ? err.message : t('plans.discountSaveError'));
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
      setError(err instanceof ApiError ? err.message : t('plans.provisionError'));
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
        setError(t('plans.deleteError'));
      }
    } finally {
      setPendingPlanDelete(null);
      setPendingDiscountDelete(null);
    }
  };

  const planColumns: GridColDef<BillingPlan>[] = useMemo(
    () => [
      { field: 'name', headerName: t('common.plan'), flex: 1, minWidth: 220 },
      {
        field: 'base_amount_cents',
        headerName: t('common.fullAmount'),
        width: 160,
        renderCell: renderAmount,
      },
      {
        field: 'actions',
        headerName: t('common.actions'),
        width: 110,
        sortable: false,
        filterable: false,
        align: 'right',
        headerAlign: 'right',
        renderCell: ({ row }: GridRenderCellParams<BillingPlan>) => (
          <Stack direction="row" spacing={0.5} justifyContent="flex-end" height={1}>
            <Tooltip title={t('common.edit')}>
              <IconButton
                size="small"
                aria-label={t('plans.editPlanAria', { name: row.name })}
                onClick={() => openPlanForm(row)}
              >
                <IconifyIcon icon="mingcute:edit-2-line" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('common.delete')}>
              <IconButton
                size="small"
                aria-label={t('plans.deletePlanAria', { name: row.name })}
                onClick={() => setPendingPlanDelete(row)}
              >
                <IconifyIcon icon="mingcute:delete-2-line" />
              </IconButton>
            </Tooltip>
          </Stack>
        ),
      },
    ],
    [t],
  );

  const discountColumns: GridColDef<PlanDiscount>[] = useMemo(
    () => [
      { field: 'name', headerName: t('common.discount'), flex: 1, minWidth: 200 },
      {
        field: 'percent',
        headerName: t('common.percent'),
        width: 150,
        renderCell: (params) => renderPercent(params, t('plans.fullPercent')),
      },
      {
        field: 'actions',
        headerName: t('common.actions'),
        width: 110,
        sortable: false,
        filterable: false,
        align: 'right',
        headerAlign: 'right',
        renderCell: ({ row }: GridRenderCellParams<PlanDiscount>) => (
          <Stack direction="row" spacing={0.5} justifyContent="flex-end" height={1}>
            <Tooltip title={t('common.edit')}>
              <IconButton
                size="small"
                aria-label={t('plans.editDiscountAria', { name: row.name })}
                onClick={() => openDiscountForm(row)}
              >
                <IconifyIcon icon="mingcute:edit-2-line" />
              </IconButton>
            </Tooltip>
            <Tooltip
              title={row.in_use ? t('plans.inUseDiscountTooltip') : t('common.delete')}
            >
              <span>
                <IconButton
                  size="small"
                  aria-label={t('plans.deleteDiscountAria', { name: row.name })}
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
    ],
    [t],
  );

  if (!school) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title={t('plans.title')} />
        <SectionCard>
          <EmptyState
            title={t('common.noAccess.title')}
            description={t('plans.noAccess.description')}
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader title={t('plans.title')} subtitle="" />

      {error && <ErrorBanner message={error} />}

      <SectionCard
        title={t('plans.plansSection')}
        padding={0}
        headerActions={
          <Button variant="contained" size="small" onClick={() => openPlanForm(null)}>
            {t('plans.newPlan')}
          </Button>
        }
      >
        {!loading && plans.length === 0 ? (
          <EmptyState
            title={t('plans.empty.plan.title')}
            description={t('plans.empty.plan.description')}
            action={
              <Button variant="contained" size="small" onClick={() => openPlanForm(null)}>
                {t('plans.newPlan')}
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
        title={t('plans.discountsSection')}
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
              {t('plans.defaultsDiscounts')}
            </Button>
            <Button variant="contained" size="small" onClick={() => openDiscountForm(null)}>
              {t('plans.newDiscount')}
            </Button>
          </>
        }
      >
        {!loading && discounts.length === 0 ? (
          <EmptyState
            title={t('plans.empty.discount.title')}
            description={t('plans.empty.discount.description')}
            action={
              <Button
                variant="contained"
                size="small"
                onClick={handleProvisionDefaults}
                disabled={provisioning}
              >
                {provisioning ? t('common.creating') : t('plans.createDefaultsDiscounts')}
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
        <DialogTitle>
          {planForm.editing ? t('plans.editPlan') : t('plans.newPlan')}
        </DialogTitle>
        <Stack component="form" onSubmit={submitPlan} direction="column" noValidate>
          <DialogContent>
            <Grid container spacing={2.5} pt={0.5}>
              <Grid size={12}>
                <TextField
                  id="plan-name"
                  label={t('plans.planNameLabel')}
                  placeholder={t('plans.planNamePlaceholder')}
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
                  label={t('plans.planAmountLabel')}
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
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? t('common.saving') : t('common.save')}
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
        <DialogTitle>
          {discountForm.editing ? t('plans.editDiscount') : t('plans.newDiscount')}
        </DialogTitle>
        <Stack component="form" onSubmit={submitDiscount} direction="column" noValidate>
          <DialogContent>
            <Grid container spacing={2.5} pt={0.5}>
              <Grid size={12}>
                <TextField
                  id="discount-name"
                  label={t('common.name')}
                  placeholder={t('plans.discountNamePlaceholder')}
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
                  label={t('common.percent')}
                  type="number"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  variant="filled"
                  fullWidth
                  required
                  helperText={t('plans.discountPercentHelper')}
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
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          </DialogActions>
        </Stack>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingPlanDelete)}
        title={t('plans.deletePlanTitle')}
        message={t('plans.deletePlanMessage', { name: pendingPlanDelete?.name ?? '' })}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={() => confirmDelete('plan')}
        onCancel={() => setPendingPlanDelete(null)}
      />

      <ConfirmDialog
        open={Boolean(pendingDiscountDelete)}
        title={t('plans.deleteDiscountTitle')}
        message={t('plans.deleteDiscountMessage', { name: pendingDiscountDelete?.name ?? '' })}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={() => confirmDelete('discount')}
        onCancel={() => setPendingDiscountDelete(null)}
      />
    </Stack>
  );
};

export default Plans;
