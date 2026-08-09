import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
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
import { ApiError } from 'services/api';
import { createSchool, deleteSchool, listSchools, updateSchool } from 'services/schoolsApi';
import { School } from 'types/school';

const PAGE_SIZE = 25;

type FormField = 'name' | 'cnpj' | 'address' | 'saas_plan';

type FormState = Record<FormField, string>;

const emptyForm: FormState = { name: '', cnpj: '', address: '', saas_plan: '' };

const renderOptional = ({ value }: GridRenderCellParams<School, string | null>) =>
  value ? (
    <Typography variant="body2">{value}</Typography>
  ) : (
    <Typography variant="body2" color="text.secondary">
      —
    </Typography>
  );

/**
 * The school register. Unlike every other page here it is not school-scoped: `SchoolPolicy`
 * returns every school to a backoffice user, and only the ones they administer to a school admin.
 */
const Schools = () => {
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
  const [pendingDelete, setPendingDelete] = useState<School | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await listSchools(page + 1);
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
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const openForm = (school: School | null) => {
    setEditing(school);
    setForm(
      school
        ? {
            name: school.name ?? '',
            cnpj: school.cnpj ?? '',
            address: school.address ?? '',
            saas_plan: school.saas_plan ?? '',
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

    if (!form.name.trim()) {
      setFieldErrors({ name: 'Informe o nome da escola.' });
      return;
    }

    setSaving(true);
    setFormError('');

    const payload = {
      name: form.name.trim(),
      cnpj: form.cnpj.trim() || null,
      address: form.address.trim() || null,
      saas_plan: form.saas_plan.trim() || null,
    };

    try {
      if (editing) {
        await updateSchool(editing.id, payload);
      } else {
        await createSchool(payload);
      }

      setFormOpen(false);
      setEditing(null);
      load();
    } catch (err) {
      if (err instanceof ApiError) {
        const mapped: Partial<Record<FormField, string>> = {};
        Object.entries(err.details).forEach(([key, value]) => {
          if (key in form && Array.isArray(value) && typeof value[0] === 'string') {
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

  const columns: GridColDef<School>[] = [
    { field: 'name', headerName: 'Nome', flex: 1, minWidth: 200 },
    { field: 'cnpj', headerName: 'CNPJ', width: 190, renderCell: renderOptional },
    { field: 'address', headerName: 'Endereço', flex: 1, minWidth: 200, renderCell: renderOptional },
    { field: 'saas_plan', headerName: 'Plano', width: 130, renderCell: renderOptional },
    {
      field: 'actions',
      headerName: 'Ações',
      width: 110,
      sortable: false,
      filterable: false,
      align: 'right',
      headerAlign: 'right',
      renderCell: ({ row }: GridRenderCellParams<School>) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end" height={1}>
          <Tooltip title="Editar">
            <IconButton size="small" aria-label={`Editar ${row.name}`} onClick={() => openForm(row)}>
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
            description="O cadastro de escolas está disponível para o backoffice e para administradores de escola."
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
        subtitle="Escolas que você administra"
        actions={
          <Button variant="contained" size="small" onClick={() => openForm(null)}>
            Nova escola
          </Button>
        }
      />

      {error && <ErrorBanner message={error} />}

      <SectionCard padding={0}>
        {!loading && schools.length === 0 && !error ? (
          <EmptyState
            title="Nenhuma escola"
            description="Cadastre uma escola para começar. Você se torna administrador dela."
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
        onClose={saving ? undefined : () => setFormOpen(false)}
        maxWidth="sm"
        fullWidth
      >
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
            <Button onClick={() => setFormOpen(false)} color="inherit" disabled={saving}>
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
