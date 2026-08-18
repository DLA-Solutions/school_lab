import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import IconifyIcon from 'components/base/IconifyIcon';
import {
  DataTable,
  EmptyState,
  ErrorBanner,
  PageHeader,
  SectionCard,
  SemanticChip,
} from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { ApiError } from 'services/api';
import {
  createSubscription,
  listPlans,
  listSubscriptions,
  updateSubscription,
} from 'services/subscriptionsApi';
import {
  PlatformPlan,
  PlatformSubscription,
  SubscriptionListFilters,
  SubscriptionStatus,
} from 'types/subscription';

const PAGE_SIZE = 25;
const ALL_STATUS = 'all';

type StatusFilter = SubscriptionStatus | typeof ALL_STATUS;

type FormState = {
  school_id: string;
  platform_plan_id: string;
  status: SubscriptionStatus;
};

const emptyForm = (): FormState => ({
  school_id: '',
  platform_plan_id: '',
  status: 'active',
});

const STATUS_CHIP: Record<SubscriptionStatus, { variant: 'success' | 'warning' | 'error' }> = {
  active: { variant: 'success' },
  trial: { variant: 'warning' },
  past_due: { variant: 'error' },
};

const formatCurrency = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/**
 * Platform SaaS subscriptions — assign and manage billing plans per school.
 */
const Subscriptions = () => {
  const { t } = useTranslation();

  const [subscriptions, setSubscriptions] = useState<PlatformSubscription[]>([]);
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>(ALL_STATUS);
  const [schoolIdFilter, setSchoolIdFilter] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PlatformSubscription | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const listFilters = useMemo<SubscriptionListFilters>(
    () => ({
      status: statusFilter === ALL_STATUS ? '' : statusFilter,
      school_id: schoolIdFilter.trim(),
    }),
    [schoolIdFilter, statusFilter],
  );

  useEffect(() => {
    listPlans()
      .then(setPlans)
      .catch(() => {
        /* plans optional for list view */
      });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await listSubscriptions(page + 1, listFilters);
      setSubscriptions(response.data);
      setTotal(response.meta.total);
    } catch (err) {
      setSubscriptions([]);
      setTotal(0);

      if (err instanceof ApiError && err.status === 403) {
        setForbidden(true);
      } else {
        setError(
          err instanceof ApiError ? err.message : t('backoffice.subscriptions.loadError'),
        );
      }
    } finally {
      setLoading(false);
    }
  }, [listFilters, page, t]);

  useEffect(() => {
    setPage(0);
  }, [statusFilter, schoolIdFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (subscription: PlatformSubscription) => {
    setEditing(subscription);
    setForm({
      school_id: String(subscription.school_id),
      platform_plan_id: String(subscription.platform_plan_id),
      status: subscription.status,
    });
    setFormError('');
    setFormOpen(true);
  };

  const closeForm = () => {
    if (!saving) {
      setFormOpen(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');

    try {
      if (editing) {
        await updateSubscription(editing.id, {
          platform_plan_id: Number(form.platform_plan_id),
          status: form.status,
        });
      } else {
        await createSubscription({
          school_id: Number(form.school_id),
          platform_plan_id: Number(form.platform_plan_id),
          status: form.status,
        });
        setPage(0);
      }

      setFormOpen(false);
      await load();
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : t('backoffice.subscriptions.saveError'),
      );
    } finally {
      setSaving(false);
    }
  };

  const columns: GridColDef<PlatformSubscription>[] = [
    {
      field: 'school_id',
      headerName: t('backoffice.subscriptions.schoolId'),
      width: 100,
    },
    {
      field: 'school_name',
      headerName: t('backoffice.subscriptions.schoolName'),
      flex: 1,
      minWidth: 160,
      valueGetter: (_value, row) => row.school?.name ?? null,
      renderCell: renderOptionalText,
    },
    {
      field: 'plan_name',
      headerName: t('backoffice.subscriptions.plan'),
      flex: 1,
      minWidth: 120,
      valueGetter: (_value, row) => row.platform_plan?.name ?? null,
      renderCell: renderOptionalText,
    },
    {
      field: 'status',
      headerName: t('backoffice.subscriptions.status'),
      width: 120,
      renderCell: ({ row }: GridRenderCellParams<PlatformSubscription>) => {
        const meta = STATUS_CHIP[row.status];
        return (
          <SemanticChip
            variant={meta.variant}
            label={t(`backoffice.subscriptions.status.${row.status}`)}
          />
        );
      },
    },
    {
      field: 'monthly_amount',
      headerName: t('backoffice.subscriptions.monthlyAmount'),
      width: 130,
      sortable: false,
      valueGetter: (_value, row) => row.platform_plan?.monthly_amount_cents ?? null,
      renderCell: ({ value }: GridRenderCellParams<PlatformSubscription, number | null>) =>
        value != null ? (
          <Typography variant="body2">{formatCurrency(value)}</Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">
            —
          </Typography>
        ),
    },
    {
      field: 'actions',
      headerName: t('backoffice.subscriptions.actions'),
      width: 80,
      sortable: false,
      filterable: false,
      renderCell: ({ row }: GridRenderCellParams<PlatformSubscription>) => (
        <Tooltip title={t('backoffice.subscriptions.edit')}>
          <IconButton size="small" aria-label={t('backoffice.subscriptions.edit')} onClick={() => openEdit(row)}>
            <IconifyIcon icon="mingcute:edit-2-line" />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  if (forbidden) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title={t('backoffice.subscriptions.title')} />
        <SectionCard>
          <EmptyState
            title={t('backoffice.subscriptions.noAccess.title')}
            description={t('backoffice.subscriptions.noAccess.description')}
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader
        title={t('backoffice.subscriptions.title')}
        subtitle={t('backoffice.subscriptions.subtitle')}
        actions={
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
            <TextField
              label={t('backoffice.subscriptions.filterSchoolId')}
              value={schoolIdFilter}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setSchoolIdFilter(event.target.value)}
              size="small"
              variant="filled"
              sx={{ width: 130 }}
            />
            <TextField
              label={t('backoffice.subscriptions.filterStatus')}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              select
              size="small"
              variant="filled"
              sx={{ width: 140 }}
            >
              <MenuItem value={ALL_STATUS}>{t('backoffice.subscriptions.statusAll')}</MenuItem>
              {(['active', 'trial', 'past_due'] as SubscriptionStatus[]).map((status) => (
                <MenuItem key={status} value={status}>
                  {t(`backoffice.subscriptions.status.${status}`)}
                </MenuItem>
              ))}
            </TextField>
            <Button variant="contained" size="small" onClick={openCreate}>
              {t('backoffice.subscriptions.create')}
            </Button>
          </Stack>
        }
      />

      {error && <ErrorBanner message={error} />}

      <SectionCard padding={0}>
        {!loading && subscriptions.length === 0 && !error ? (
          <EmptyState
            title={t('backoffice.subscriptions.empty')}
            description={t('backoffice.subscriptions.subtitle')}
          />
        ) : (
          <Box px={3.5} py={3.5} sx={{ height: 594, width: 1 }}>
            <DataTable
              rows={subscriptions}
              columns={columns}
              loading={loading}
              disableRowSelectionOnClick
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

      <Dialog open={formOpen} onClose={closeForm} fullWidth maxWidth="sm">
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            {editing
              ? t('backoffice.subscriptions.editTitle')
              : t('backoffice.subscriptions.createTitle')}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} mt={1}>
              {formError && <ErrorBanner message={formError} />}
              <TextField
                label={t('backoffice.subscriptions.schoolId')}
                value={form.school_id}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setForm((current) => ({ ...current, school_id: event.target.value }))
                }
                required
                disabled={Boolean(editing)}
                fullWidth
                variant="filled"
                type="number"
              />
              <TextField
                label={t('backoffice.subscriptions.plan')}
                value={form.platform_plan_id}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setForm((current) => ({ ...current, platform_plan_id: event.target.value }))
                }
                required
                select
                fullWidth
                variant="filled"
              >
                {plans.map((plan) => (
                  <MenuItem key={plan.id} value={String(plan.id)}>
                    {plan.name} ({formatCurrency(plan.monthly_amount_cents)})
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label={t('backoffice.subscriptions.status')}
                value={form.status}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value as SubscriptionStatus,
                  }))
                }
                select
                fullWidth
                variant="filled"
              >
                {(['active', 'trial', 'past_due'] as SubscriptionStatus[]).map((status) => (
                  <MenuItem key={status} value={status}>
                    {t(`backoffice.subscriptions.status.${status}`)}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeForm} disabled={saving}>
              {t('backoffice.subscriptions.cancel')}
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={
                saving ||
                !form.platform_plan_id ||
                (!editing && !form.school_id.trim())
              }
            >
              {t('backoffice.subscriptions.save')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Stack>
  );
};

const renderOptionalText = ({ value }: GridRenderCellParams<PlatformSubscription, string | null>) =>
  value ? (
    <Typography variant="body2">{value}</Typography>
  ) : (
    <Typography variant="body2" color="text.secondary">
      —
    </Typography>
  );

export default Subscriptions;
