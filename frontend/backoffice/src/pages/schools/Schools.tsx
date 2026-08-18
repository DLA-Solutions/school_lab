import { ChangeEvent, FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
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
  SearchField,
  SectionCard,
  SemanticChip,
  SuccessBanner,
} from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { ApiError } from 'services/api';
import {
  createSchool,
  deleteSchool,
  listSchools,
  restoreSchool,
  SchoolListFilters,
  updateSchool,
} from 'services/schoolsApi';
import paths from 'routes/paths';
import { SchoolOnboardingMode } from 'types/onboarding';
import { CreateSchoolMeta, School } from 'types/school';
import { normalizeSchoolSearchQuery } from 'utils/search/normalizeSchoolSearchQuery';

const PAGE_SIZE = 25;

type FormField =
  | 'name'
  | 'cnpj'
  | 'address'
  | 'saas_plan'
  | 'onboarding_mode'
  | 'owner_email'
  | 'signature_email';

type FormState = Record<FormField, string>;

const emptyForm: FormState = {
  name: '',
  cnpj: '',
  signature_email: '',
  address: '',
  saas_plan: '',
  onboarding_mode: 'self_serve',
  owner_email: '',
};

const ONBOARDING_MODE_CHIP_VARIANT: Record<
  SchoolOnboardingMode,
  'info' | 'warning'
> = {
  self_serve: 'info',
  white_glove: 'warning',
};

const ALL_FILTER = 'all';

type SchoolListTab = 'active' | 'archived';
type OnboardingStatusFilter = NonNullable<School['onboarding_status']> | typeof ALL_FILTER;
type OnboardingModeFilter = SchoolOnboardingMode | typeof ALL_FILTER;
type SaasPlanFilter = string;

const SAAS_PLAN_FILTER_LABELS: Record<string, string> = {
  all: 'Todos',
  standard: 'standard',
  partner: 'partner',
};

const parseListTab = (value: string | null): SchoolListTab =>
  value === 'archived' ? 'archived' : 'active';

const ONBOARDING_MODE_LABELS: Record<SchoolOnboardingMode, string> = {
  self_serve: 'Autoatendimento',
  white_glove: 'Premium (white-glove)',
};

const ONBOARDING_STATUS_FILTER_LABELS: Record<OnboardingStatusFilter, string> = {
  all: 'Todos',
  provisioning: 'Em provisionamento',
  pending_handoff: 'Aguardando repasse',
  active: 'Ativa',
};

const ONBOARDING_MODE_FILTER_LABELS: Record<OnboardingModeFilter, string> = {
  all: 'Todos',
  self_serve: 'Autoatendimento',
  white_glove: 'Premium (white-glove)',
};

const parseStatusFilter = (value: string | null): OnboardingStatusFilter => {
  if (value && value in ONBOARDING_STATUS_FILTER_LABELS && value !== ALL_FILTER) {
    return value as OnboardingStatusFilter;
  }

  return ALL_FILTER;
};

const parseModeFilter = (value: string | null): OnboardingModeFilter => {
  if (value && value in ONBOARDING_MODE_FILTER_LABELS && value !== ALL_FILTER) {
    return value as OnboardingModeFilter;
  }

  return ALL_FILTER;
};
const ONBOARDING_STATUS_LABELS: Record<
  NonNullable<School['onboarding_status']>,
  { label: string; variant: 'info' | 'warning' | 'success' }
> = {
  provisioning: { label: 'Em provisionamento', variant: 'warning' },
  pending_handoff: { label: 'Aguardando repasse', variant: 'info' },
  active: { label: 'Ativa', variant: 'success' },
};

const createdSchoolSuccessMessage = (school: School, meta?: CreateSchoolMeta) => {
  if (school.onboarding_mode === 'white_glove') {
    return `${school.name} foi criada e está pronta para provisionamento.`;
  }

  if (meta?.owner_invite_email_status === 'not_configured') {
    return `${school.name} foi criada. O convite foi gerado, mas o envio de e-mail não está configurado neste ambiente.`;
  }

  return `${school.name} foi criada. Um e-mail com o link de ativação foi enviado ao responsável.`;
};

const renderOptional = ({ value }: GridRenderCellParams<School, string | null>) =>
  value ? (
    <Typography variant="body2">{value}</Typography>
  ) : (
    <Typography variant="body2" color="text.secondary">
      —
    </Typography>
  );

const formatDiscardedAt = (value?: string | null) => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('pt-BR');
};

/**
 * Platform school register — lists every school for backoffice operators.
 */
const Schools = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const backoffice = true;

  const [schools, setSchools] = useState<School[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<School | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FormField, string>>>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [createdSchool, setCreatedSchool] = useState<School | null>(null);
  const [createdSchoolMeta, setCreatedSchoolMeta] = useState<CreateSchoolMeta | undefined>();
  const [pendingDelete, setPendingDelete] = useState<School | null>(null);
  const [pendingRestore, setPendingRestore] = useState<School | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState('');
  const [listTab, setListTab] = useState<SchoolListTab>(() => parseListTab(searchParams.get('tab')));
  const [searchInput, setSearchInput] = useState(() => searchParams.get('q') ?? '');
  const [searchQuery, setSearchQuery] = useState(() =>
    normalizeSchoolSearchQuery(searchParams.get('q') ?? ''),
  );
  const [saasPlanFilter, setSaasPlanFilter] = useState<SaasPlanFilter>(() => {
    const value = searchParams.get('saas_plan');
    return value && value in SAAS_PLAN_FILTER_LABELS ? value : ALL_FILTER;
  });
  const [createdAfter, setCreatedAfter] = useState(() => searchParams.get('created_after') ?? '');
  const [createdBefore, setCreatedBefore] = useState(
    () => searchParams.get('created_before') ?? '',
  );
  const [statusFilter, setStatusFilter] = useState<OnboardingStatusFilter>(() =>
    parseStatusFilter(searchParams.get('onboarding_status')),
  );
  const [modeFilter, setModeFilter] = useState<OnboardingModeFilter>(() =>
    parseModeFilter(searchParams.get('onboarding_mode')),
  );

  const isArchivedTab = listTab === 'archived';

  const listFilters = useMemo<SchoolListFilters>(
    () => ({
      q: searchQuery,
      saas_plan: saasPlanFilter === ALL_FILTER ? '' : saasPlanFilter,
      created_after: createdAfter,
      created_before: createdBefore,
      discarded: isArchivedTab,
      onboarding_status: statusFilter === ALL_FILTER ? '' : statusFilter,
      onboarding_mode: modeFilter === ALL_FILTER ? '' : modeFilter,
    }),
    [
      createdAfter,
      createdBefore,
      isArchivedTab,
      modeFilter,
      saasPlanFilter,
      searchQuery,
      statusFilter,
    ],
  );

  const hasActiveFilters =
    Boolean(searchQuery) ||
    saasPlanFilter !== ALL_FILTER ||
    Boolean(createdAfter) ||
    Boolean(createdBefore) ||
    statusFilter !== ALL_FILTER ||
    modeFilter !== ALL_FILTER;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await listSchools(page + 1, listFilters);
      setSchools(response.data);
      setTotal(response.meta.total);
    } catch (err) {
      setSchools([]);
      setTotal(0);

      if (err instanceof ApiError && err.status === 403) {
        setForbidden(true);
      } else {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Não foi possível carregar as escolas. Verifique sua conexão.',
        );
      }
    } finally {
      setLoading(false);
    }
  }, [listFilters, page]);

  useEffect(() => {
    setPage(0);
  }, [
    createdAfter,
    createdBefore,
    listTab,
    modeFilter,
    saasPlanFilter,
    searchQuery,
    statusFilter,
  ]);

  useEffect(() => {
    const params = new URLSearchParams();

    if (listTab === 'archived') {
      params.set('tab', 'archived');
    }

    if (searchQuery) {
      params.set('q', searchQuery);
    }

    if (saasPlanFilter !== ALL_FILTER) {
      params.set('saas_plan', saasPlanFilter);
    }

    if (createdAfter) {
      params.set('created_after', createdAfter);
    }

    if (createdBefore) {
      params.set('created_before', createdBefore);
    }

    if (statusFilter !== ALL_FILTER) {
      params.set('onboarding_status', statusFilter);
    }

    if (modeFilter !== ALL_FILTER) {
      params.set('onboarding_mode', modeFilter);
    }

    setSearchParams(params, { replace: true });
  }, [
    createdAfter,
    createdBefore,
    listTab,
    modeFilter,
    saasPlanFilter,
    searchQuery,
    setSearchParams,
    statusFilter,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setCreatedSchool(null);
    setCreatedSchoolMeta(undefined);
    setFieldErrors({});
    setFormError('');
  };

  const openForm = (school: School | null) => {
    setEditing(school);
    setCreatedSchool(null);
    setCreatedSchoolMeta(undefined);
    setForm(
      school
        ? {
            name: school.name ?? '',
            cnpj: school.cnpj ?? '',
            signature_email: school.signature_email ?? '',
            address: school.address ?? '',
            saas_plan: school.saas_plan ?? '',
            onboarding_mode: 'self_serve',
            owner_email: '',
          }
        : emptyForm,
    );
    setFieldErrors({});
    setFormError('');
    setFormOpen(true);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
    setFormError('');
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const nextFieldErrors: Partial<Record<FormField, string>> = {};

    if (!form.name.trim()) {
      nextFieldErrors.name = 'Informe o nome da escola.';
    }

    if (!editing && backoffice && !form.owner_email.trim()) {
      nextFieldErrors.owner_email = 'Informe o e-mail do responsável.';
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    setSaving(true);
    setFormError('');

    const payload = {
      name: form.name.trim(),
      cnpj: form.cnpj.trim() || null,
      signature_email: form.signature_email.trim() || null,
      address: form.address.trim() || null,
      saas_plan: form.saas_plan.trim() || null,
      ...(backoffice && !editing
        ? {
            onboarding_mode: form.onboarding_mode as SchoolOnboardingMode,
            owner_email: form.owner_email.trim(),
          }
        : {}),
    };

    try {
      if (editing) {
        await updateSchool(editing.id, payload);
        closeForm();
        load();
      } else {
        const { school, meta } = await createSchool(payload);
        setCreatedSchool(school);
        setCreatedSchoolMeta(meta);
        load();

        if (
          school.onboarding_mode === 'white_glove' &&
          school.onboarding_status === 'provisioning'
        ) {
          navigate(paths.provisioningWizard(school.id));
        }
      }
    } catch (err) {
      if (err instanceof ApiError) {
        const mapped: Partial<Record<FormField, string>> = {};
        Object.entries(err.details).forEach(([key, value]) => {
          if (key in emptyForm && Array.isArray(value) && typeof value[0] === 'string') {
            mapped[key as FormField] = value[0];
          }
        });
        setFieldErrors(mapped);
        if (Object.keys(mapped).length === 0) {
          setFormError(err.message);
        }
      } else {
        setFormError('Não foi possível salvar. Verifique sua conexão.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) {
      return;
    }

    try {
      await deleteSchool(pendingDelete.id);
      setPendingDelete(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível excluir a escola.');
      setPendingDelete(null);
    }
  };

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchInput(event.target.value);
  };

  const handleSearchSubmit = () => {
    setSearchQuery(normalizeSchoolSearchQuery(searchInput));
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearchSubmit();
    }
  };

  const handleConfirmRestore = async () => {
    if (!pendingRestore) {
      return;
    }

    try {
      await restoreSchool(pendingRestore.id);
      setPendingRestore(null);
      setRestoreSuccess(t('backoffice.schools.restoreSuccess'));
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível restaurar a escola.');
      setPendingRestore(null);
    }
  };

  const createdStatus = createdSchool?.onboarding_status;
  const createdStatusMeta = createdStatus ? ONBOARDING_STATUS_LABELS[createdStatus] : null;

  const showContinueProvisioning = (school: School) =>
    school.onboarding_mode === 'white_glove' && school.onboarding_status === 'provisioning';

  const showPendingHandoffAction = (school: School) => school.onboarding_status === 'pending_handoff';

  const columns: GridColDef<School>[] = useMemo(() => {
    const baseColumns: GridColDef<School>[] = [
      { field: 'name', headerName: 'Nome', flex: 1, minWidth: 200 },
      { field: 'cnpj', headerName: 'CNPJ', width: 190, renderCell: renderOptional },
      {
        field: 'address',
        headerName: 'Endereço',
        flex: 1,
        minWidth: 200,
        renderCell: renderOptional,
      },
      { field: 'saas_plan', headerName: 'Plano', width: 130, renderCell: renderOptional },
    ];

    if (isArchivedTab) {
      baseColumns.push({
        field: 'discarded_at',
        headerName: t('backoffice.schools.discardedAt'),
        width: 150,
        sortable: false,
        filterable: false,
        renderCell: ({ row }: GridRenderCellParams<School>) => (
          <Typography variant="body2">{formatDiscardedAt(row.discarded_at)}</Typography>
        ),
      });
    } else {
      baseColumns.push(
        {
          field: 'onboarding_status',
          headerName: 'Status',
          width: 190,
          sortable: false,
          filterable: false,
          renderCell: ({ row }: GridRenderCellParams<School>) => {
            const status = row.onboarding_status;

            if (!status) {
              return (
                <Typography variant="body2" color="text.secondary">
                  —
                </Typography>
              );
            }

            const meta = ONBOARDING_STATUS_LABELS[status];

            return <SemanticChip variant={meta.variant} label={meta.label} />;
          },
        },
        {
          field: 'onboarding_mode',
          headerName: 'Modo',
          width: 200,
          sortable: false,
          filterable: false,
          renderCell: ({ row }: GridRenderCellParams<School>) => {
            const mode = row.onboarding_mode;

            if (!mode) {
              return (
                <Typography variant="body2" color="text.secondary">
                  —
                </Typography>
              );
            }

            return (
              <SemanticChip
                variant={ONBOARDING_MODE_CHIP_VARIANT[mode]}
                label={ONBOARDING_MODE_LABELS[mode]}
              />
            );
          },
        },
      );
    }

    baseColumns.push({
      field: 'actions',
      headerName: 'Ações',
      width: isArchivedTab ? 120 : 245,
      sortable: false,
      filterable: false,
      align: 'right',
      headerAlign: 'right',
      renderCell: ({ row }: GridRenderCellParams<School>) =>
        isArchivedTab ? (
          <Stack direction="row" spacing={0.5} justifyContent="flex-end" height={1}>
            <Tooltip title={t('backoffice.schools.restore')}>
              <IconButton
                size="small"
                aria-label={`${t('backoffice.schools.restore')} ${row.name}`}
                onClick={() => setPendingRestore(row)}
                color="success"
              >
                <IconifyIcon icon="mingcute:refresh-2-line" />
              </IconButton>
            </Tooltip>
          </Stack>
        ) : (
          <Stack direction="row" spacing={0.5} justifyContent="flex-end" height={1}>
            <Tooltip title={t('backoffice.schools.viewDetail')}>
              <IconButton
                size="small"
                aria-label={`${t('backoffice.schools.viewDetail')} ${row.name}`}
                component={RouterLink}
                to={paths.schoolDetail(row.id)}
              >
                <IconifyIcon icon="mingcute:eye-line" />
              </IconButton>
            </Tooltip>
            {showContinueProvisioning(row) && (
              <Tooltip title="Continuar provisionamento">
                <IconButton
                  size="small"
                  aria-label={`Continuar provisionamento de ${row.name}`}
                  component={RouterLink}
                  to={paths.provisioningWizard(row.id)}
                >
                  <IconifyIcon icon="mingcute:settings-3-line" />
                </IconButton>
              </Tooltip>
            )}
            {showPendingHandoffAction(row) && (
              <Tooltip title="Ativar escola">
                <IconButton
                  size="small"
                  aria-label={`Ativar ${row.name}`}
                  component={RouterLink}
                  to={paths.schoolActivation(row.id)}
                  color="info"
                >
                  <IconifyIcon icon="mingcute:check-circle-line" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Credenciais bancárias">
              <IconButton
                size="small"
                aria-label={`Credenciais bancárias de ${row.name}`}
                component={RouterLink}
                to={paths.bankCredentials(row.id)}
              >
                <IconifyIcon icon="mingcute:bank-card-line" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Editar">
              <IconButton
                size="small"
                aria-label={`Editar ${row.name}`}
                onClick={() => openForm(row)}
              >
                <IconifyIcon icon="mingcute:edit-2-line" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Excluir">
              <IconButton
                size="small"
                aria-label={`Excluir ${row.name}`}
                onClick={() => setPendingDelete(row)}
              >
                <IconifyIcon icon="mingcute:delete-2-line" />
              </IconButton>
            </Tooltip>
          </Stack>
        ),
    });

    return baseColumns;
  }, [isArchivedTab, t]);

  if (forbidden) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title={t('backoffice.schools.title')} />
        <SectionCard>
          <EmptyState
            title="Sem acesso a esta área"
            description="Cadastro e provisionamento de escolas na plataforma."
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader
        title={t('backoffice.schools.title')}
        subtitle=""
        actions={
          !isArchivedTab ? (
            <Button variant="contained" size="small" onClick={() => openForm(null)}>
              Nova escola
            </Button>
          ) : undefined
        }
      />

      <Tabs
        value={listTab}
        onChange={(_event, value: SchoolListTab) => {
          setListTab(value);
          setRestoreSuccess('');
        }}
      >
        <Tab value="active" label={t('backoffice.schools.tab.active')} />
        <Tab value="archived" label={t('backoffice.schools.tab.archived')} />
      </Tabs>

      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
        <SearchField
          value={searchInput}
          onChange={handleSearchChange}
          placeholder={t('backoffice.schools.searchPlaceholder')}
          ariaLabel={t('backoffice.schools.searchAriaLabel')}
          onKeyDown={handleSearchKeyDown}
        />
        <TextField
          id="school-saas-plan-filter"
          label={t('backoffice.schools.planFilter')}
          value={saasPlanFilter}
          onChange={(event) => setSaasPlanFilter(event.target.value)}
          select
          size="small"
          variant="filled"
          sx={{ width: 150 }}
        >
          {Object.keys(SAAS_PLAN_FILTER_LABELS).map((value) => (
            <MenuItem key={value} value={value}>
              {value === ALL_FILTER ? t('backoffice.schools.planAll') : value}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          id="school-created-after"
          label={t('backoffice.schools.createdAfter')}
          type="date"
          value={createdAfter}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setCreatedAfter(event.target.value)}
          size="small"
          variant="filled"
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ width: 170 }}
        />
        <TextField
          id="school-created-before"
          label={t('backoffice.schools.createdBefore')}
          type="date"
          value={createdBefore}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setCreatedBefore(event.target.value)}
          size="small"
          variant="filled"
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ width: 170 }}
        />
        {!isArchivedTab && (
          <>
            <TextField
              id="school-onboarding-status-filter"
              label="Status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as OnboardingStatusFilter)}
              select
              size="small"
              variant="filled"
              sx={{ width: 210 }}
            >
              {(Object.keys(ONBOARDING_STATUS_FILTER_LABELS) as OnboardingStatusFilter[]).map(
                (value) => (
                  <MenuItem key={value} value={value}>
                    {ONBOARDING_STATUS_FILTER_LABELS[value]}
                  </MenuItem>
                ),
              )}
            </TextField>
            <TextField
              id="school-onboarding-mode-filter"
              label="Modo"
              value={modeFilter}
              onChange={(event) => setModeFilter(event.target.value as OnboardingModeFilter)}
              select
              size="small"
              variant="filled"
              sx={{ width: 210 }}
            >
              {(Object.keys(ONBOARDING_MODE_FILTER_LABELS) as OnboardingModeFilter[]).map(
                (value) => (
                  <MenuItem key={value} value={value}>
                    {ONBOARDING_MODE_FILTER_LABELS[value]}
                  </MenuItem>
                ),
              )}
            </TextField>
          </>
        )}
      </Stack>

      {restoreSuccess && <SuccessBanner message={restoreSuccess} />}
      {error && <ErrorBanner message={error} />}

      <SectionCard padding={0}>
        {!loading && schools.length === 0 && !error ? (
          <EmptyState
            title={
              isArchivedTab
                ? t('backoffice.schools.emptyArchived')
                : hasActiveFilters
                  ? 'Nenhuma escola encontrada'
                  : 'Nenhuma escola cadastrada'
            }
            description={
              isArchivedTab
                ? t('backoffice.schools.emptyArchivedDescription')
                : hasActiveFilters
                  ? 'Nenhuma escola corresponde aos filtros selecionados. Ajuste a busca ou os filtros.'
                  : 'Ainda não há escolas registradas na plataforma. Cadastre a primeira escola para iniciar o onboarding.'
            }
            action={
              !isArchivedTab ? (
                <Button variant="contained" size="small" onClick={() => openForm(null)}>
                  Nova escola
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Box px={3.5} py={3.5} sx={{ height: 594, width: 1 }}>
            <DataTable
              rows={schools}
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

      <Dialog
        open={formOpen}
        onClose={saving ? undefined : closeForm}
        maxWidth="sm"
        fullWidth
      >
        {createdSchool ? (
          <>
            <DialogTitle>Escola criada</DialogTitle>
            <DialogContent>
              <Stack spacing={2.5} pt={0.5}>
                <SuccessBanner>
                  {createdSchoolSuccessMessage(createdSchool, createdSchoolMeta)}
                </SuccessBanner>

                {createdStatusMeta && (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      Status:
                    </Typography>
                    <SemanticChip
                      variant={createdStatusMeta.variant}
                      label={createdStatusMeta.label}
                    />
                  </Stack>
                )}

                {createdSchool.onboarding_mode === 'white_glove' && (
                  <Typography variant="body2" color="text.secondary">
                    Configure billing, pessoas e importação CSV no assistente de provisionamento.
                  </Typography>
                )}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={closeForm} color="inherit">
                Fechar
              </Button>
              {createdSchool.onboarding_mode === 'white_glove' && (
                <Button
                  component={RouterLink}
                  to={paths.provisioningWizard(createdSchool.id)}
                  variant="contained"
                  onClick={closeForm}
                >
                  Ir para provisionamento
                </Button>
              )}
            </DialogActions>
          </>
        ) : (
          <>
            <DialogTitle>{editing ? 'Editar escola' : 'Nova escola'}</DialogTitle>
            <Stack component="form" onSubmit={handleSubmit} direction="column" noValidate>
              <DialogContent>
                <Grid container spacing={2.5} pt={0.5}>
                  <Grid size={12}>
                    <TextField
                      id="school-name"
                      name="name"
                      label="Nome"
                      value={form.name}
                      onChange={handleChange}
                      error={Boolean(fieldErrors.name)}
                      helperText={fieldErrors.name}
                      disabled={saving}
                      variant="filled"
                      fullWidth
                      autoFocus
                      required
                    />
                  </Grid>

                  {!editing && backoffice && (
                    <>
                      <Grid size={12}>
                        <TextField
                          id="school-onboarding-mode"
                          name="onboarding_mode"
                          label="Modo de onboarding"
                          value={form.onboarding_mode}
                          onChange={handleChange}
                          error={Boolean(fieldErrors.onboarding_mode)}
                          helperText={
                            fieldErrors.onboarding_mode ??
                            'Autoatendimento: o responsável conclui a configuração. Premium: o backoffice provisiona antes do repasse.'
                          }
                          disabled={saving}
                          variant="filled"
                          fullWidth
                          select
                          required
                        >
                          {(Object.keys(ONBOARDING_MODE_LABELS) as SchoolOnboardingMode[]).map(
                            (mode) => (
                              <MenuItem key={mode} value={mode}>
                                {ONBOARDING_MODE_LABELS[mode]}
                              </MenuItem>
                            ),
                          )}
                        </TextField>
                      </Grid>
                      <Grid size={12}>
                        <TextField
                          id="school-owner-email"
                          name="owner_email"
                          label="E-mail do responsável"
                          type="email"
                          value={form.owner_email}
                          onChange={handleChange}
                          error={Boolean(fieldErrors.owner_email)}
                          helperText={
                            fieldErrors.owner_email ??
                            'Diretor(a) que receberá o convite para ativar a escola.'
                          }
                          disabled={saving}
                          variant="filled"
                          fullWidth
                          required
                        />
                      </Grid>
                    </>
                  )}

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      id="school-cnpj"
                      name="cnpj"
                      label="CNPJ"
                      value={form.cnpj}
                      onChange={handleChange}
                      error={Boolean(fieldErrors.cnpj)}
                      helperText={fieldErrors.cnpj}
                      disabled={saving}
                      variant="filled"
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    {/* The school is a party to its own contracts: this is the address the
                        signature request goes to, and it signs under the CNPJ above. Leaving it
                        empty means only the guardians are asked to sign. */}
                    <TextField
                      id="school-signature-email"
                      name="signature_email"
                      label="E-mail de assinatura do contrato"
                      helperText={
                        fieldErrors.signature_email ??
                        'A escola assina sob o CNPJ acima. Em branco, só os responsáveis assinam.'
                      }
                      value={form.signature_email}
                      onChange={handleChange}
                      error={Boolean(fieldErrors.signature_email)}
                      disabled={saving}
                      variant="filled"
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      id="school-saas-plan"
                      name="saas_plan"
                      label="Plano"
                      value={form.saas_plan}
                      onChange={handleChange}
                      disabled={saving}
                      variant="filled"
                      fullWidth
                    />
                  </Grid>
                  <Grid size={12}>
                    <TextField
                      id="school-address"
                      name="address"
                      label="Endereço"
                      value={form.address}
                      onChange={handleChange}
                      disabled={saving}
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
                <Button onClick={closeForm} color="inherit" disabled={saving}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={saving}
                  startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
              </DialogActions>
            </Stack>
          </>
        )}
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Excluir escola"
        message={`Excluir ${pendingDelete?.name ?? ''}? Ela deixa de aparecer, junto com tudo que está sob ela.`}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <ConfirmDialog
        open={Boolean(pendingRestore)}
        title={t('backoffice.schools.restoreConfirmTitle')}
        message={t('backoffice.schools.restoreConfirmMessage', {
          name: pendingRestore?.name ?? '',
        })}
        confirmLabel={t('backoffice.schools.restore')}
        cancelLabel="Cancelar"
        onConfirm={handleConfirmRestore}
        onCancel={() => setPendingRestore(null)}
      />
    </Stack>
  );
};

export default Schools;
