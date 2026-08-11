import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router';
import Alert from '@mui/material/Alert';
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
  SemanticChip,
} from 'design-system';
import { ApiError } from 'services/api';
import { createSchool, deleteSchool, listSchools, SchoolListFilters, updateSchool } from 'services/schoolsApi';
import paths from 'routes/paths';
import { SchoolOnboardingMode } from 'types/onboarding';
import { School } from 'types/school';

const PAGE_SIZE = 25;

type FormField = 'name' | 'cnpj' | 'address' | 'saas_plan' | 'onboarding_mode' | 'owner_email';

type FormState = Record<FormField, string>;

const emptyForm: FormState = {
  name: '',
  cnpj: '',
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

type OnboardingStatusFilter = NonNullable<School['onboarding_status']> | typeof ALL_FILTER;
type OnboardingModeFilter = SchoolOnboardingMode | typeof ALL_FILTER;

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

const renderOptional = ({ value }: GridRenderCellParams<School, string | null>) =>
  value ? (
    <Typography variant="body2">{value}</Typography>
  ) : (
    <Typography variant="body2" color="text.secondary">
      —
    </Typography>
  );

/**
 * Platform school register — lists every school for backoffice operators.
 */
const Schools = () => {
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
  const [pendingDelete, setPendingDelete] = useState<School | null>(null);
  const [statusFilter, setStatusFilter] = useState<OnboardingStatusFilter>(() =>
    parseStatusFilter(searchParams.get('onboarding_status')),
  );
  const [modeFilter, setModeFilter] = useState<OnboardingModeFilter>(() =>
    parseModeFilter(searchParams.get('onboarding_mode')),
  );

  const listFilters = useMemo<SchoolListFilters>(
    () => ({
      onboarding_status: statusFilter === ALL_FILTER ? '' : statusFilter,
      onboarding_mode: modeFilter === ALL_FILTER ? '' : modeFilter,
    }),
    [modeFilter, statusFilter],
  );

  const hasActiveFilters = statusFilter !== ALL_FILTER || modeFilter !== ALL_FILTER;

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
  }, [statusFilter, modeFilter]);

  useEffect(() => {
    const params = new URLSearchParams();

    if (statusFilter !== ALL_FILTER) {
      params.set('onboarding_status', statusFilter);
    }

    if (modeFilter !== ALL_FILTER) {
      params.set('onboarding_mode', modeFilter);
    }

    setSearchParams(params, { replace: true });
  }, [modeFilter, setSearchParams, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setCreatedSchool(null);
    setFieldErrors({});
    setFormError('');
  };

  const openForm = (school: School | null) => {
    setEditing(school);
    setCreatedSchool(null);
    setForm(
      school
        ? {
            name: school.name ?? '',
            cnpj: school.cnpj ?? '',
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
        const school = await createSchool(payload);
        setCreatedSchool(school);
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

  const createdStatus = createdSchool?.onboarding_status;
  const createdStatusMeta = createdStatus ? ONBOARDING_STATUS_LABELS[createdStatus] : null;

  const showContinueProvisioning = (school: School) =>
    school.onboarding_mode === 'white_glove' && school.onboarding_status === 'provisioning';

  const showPendingHandoffAction = (school: School) => school.onboarding_status === 'pending_handoff';

  const columns: GridColDef<School>[] = [
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
    {
      field: 'actions',
      headerName: 'Ações',
      width: 170,
      sortable: false,
      filterable: false,
      align: 'right',
      headerAlign: 'right',
      renderCell: ({ row }: GridRenderCellParams<School>) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end" height={1}>
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
    },
  ];

  if (forbidden) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title="Escolas" />
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
        title="Escolas"
        subtitle=""
        actions={
          <Stack direction="row" spacing={1.5} alignItems="center">
            <TextField
              id="school-onboarding-status-filter"
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OnboardingStatusFilter)}
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
              onChange={(e) => setModeFilter(e.target.value as OnboardingModeFilter)}
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
            <Button variant="contained" size="small" onClick={() => openForm(null)}>
              Nova escola
            </Button>
          </Stack>
        }
      />

      {error && <ErrorBanner message={error} />}

      <SectionCard padding={0}>
        {!loading && schools.length === 0 && !error ? (
          <EmptyState
            title={hasActiveFilters ? 'Nenhuma escola encontrada' : 'Nenhuma escola cadastrada'}
            description={
              hasActiveFilters
                ? 'Nenhuma escola corresponde aos filtros selecionados. Ajuste o status ou o modo de onboarding.'
                : 'Ainda não há escolas registradas na plataforma. Cadastre a primeira escola para iniciar o onboarding.'
            }
            action={
              <Button variant="contained" size="small" onClick={() => openForm(null)}>
                Nova escola
              </Button>
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
                <Alert severity="success">
                  {createdSchool.onboarding_mode === 'white_glove'
                    ? `${createdSchool.name} foi criada e está pronta para provisionamento.`
                    : `${createdSchool.name} foi criada. Um convite foi enviado ao responsável.`}
                </Alert>

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
    </Stack>
  );
};

export default Schools;
