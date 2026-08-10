import { FormEvent, useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
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
import { useCurrentSchool } from 'providers/useCurrentSchool';
import {
  createJobPosition,
  deleteJobPosition,
  listJobPositions,
  provisionDefaultJobPositions,
  updateJobPosition,
} from 'services/academicsApi';
import { ApiError } from 'services/api';
import { JobPosition } from 'types/academics';

const PAGE_SIZE = 25;

const renderHolders = ({ row }: GridRenderCellParams<JobPosition>) =>
  row.collaborator_count === 0 ? (
    <Typography variant="body2" color="text.secondary">
      Ninguém
    </Typography>
  ) : (
    <Typography variant="body2">
      {row.collaborator_count === 1 ? '1 colaborador' : `${row.collaborator_count} colaboradores`}
    </Typography>
  );

const JobPositions = () => {
  const school = useCurrentSchool();
  const schoolId = school?.school_id ?? null;

  const [positions, setPositions] = useState<JobPosition[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<JobPosition | null>(null);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [saving, setSaving] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<JobPosition | null>(null);

  const load = useCallback(async () => {
    if (!schoolId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await listJobPositions(schoolId, page + 1);
      setPositions(response.data);
      setTotal(response.meta.total);
    } catch (err) {
      setPositions([]);
      setTotal(0);
      setError(
        err instanceof ApiError
          ? err.message
          : 'Não foi possível carregar os cargos. Verifique sua conexão.',
      );
    } finally {
      setLoading(false);
    }
  }, [schoolId, page]);

  useEffect(() => {
    load();
  }, [load]);

  const openForm = (position: JobPosition | null) => {
    setEditing(position);
    setName(position?.name ?? '');
    setNameError('');
    setFormOpen(true);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!schoolId) {
      return;
    }

    if (!name.trim()) {
      setNameError('Informe o nome do cargo.');
      return;
    }

    setSaving(true);

    try {
      if (editing) {
        await updateJobPosition(schoolId, editing.id, name.trim());
      } else {
        await createJobPosition(schoolId, name.trim());
      }

      setFormOpen(false);
      setEditing(null);
      load();
    } catch (err) {
      if (err instanceof ApiError) {
        const detail = err.details.name;
        setNameError(
          Array.isArray(detail) && typeof detail[0] === 'string' ? detail[0] : err.message,
        );
      } else {
        setNameError('Não foi possível salvar. Verifique sua conexão.');
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
      await provisionDefaultJobPositions(schoolId);
      load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Não foi possível criar os cargos padrão.',
      );
    } finally {
      setProvisioning(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!schoolId || !pendingDelete) {
      return;
    }

    try {
      await deleteJobPosition(schoolId, pendingDelete.id);
      setPendingDelete(null);
      load();
    } catch (err) {
      // The API refuses to remove a post that collaborators still hold, and says how many.
      if (err instanceof ApiError) {
        const base = err.details.base;
        setError(
          Array.isArray(base) && typeof base[0] === 'string' ? base[0] : err.message,
        );
      } else {
        setError('Não foi possível excluir o cargo.');
      }
      setPendingDelete(null);
    }
  };

  const columns: GridColDef<JobPosition>[] = [
    { field: 'name', headerName: 'Cargo', flex: 1, minWidth: 220 },
    {
      field: 'collaborator_count',
      headerName: 'Ocupado por',
      width: 170,
      renderCell: renderHolders,
    },
    {
      field: 'actions',
      headerName: 'Ações',
      width: 110,
      sortable: false,
      filterable: false,
      align: 'right',
      headerAlign: 'right',
      renderCell: ({ row }: GridRenderCellParams<JobPosition>) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end" height={1}>
          <Tooltip title="Editar">
            <IconButton size="small" aria-label={`Editar ${row.name}`} onClick={() => openForm(row)}>
              <IconifyIcon icon="mingcute:edit-2-line" />
            </IconButton>
          </Tooltip>
          {/* Removal is refused while anyone holds the post, so the button says why up front. */}
          <Tooltip title={row.in_use ? 'Cargo em uso — mova os colaboradores antes' : 'Excluir'}>
            <span>
              <IconButton
                size="small"
                aria-label={`Excluir ${row.name}`}
                onClick={() => setPendingDelete(row)}
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
        <PageHeader title="Cargos" />
        <SectionCard>
          <EmptyState
            title="Sem acesso a esta área"
            description="O cadastro de cargos está disponível apenas para usuários com vínculo ativo de escola."
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader
        title="Cargos"
        actions={
          <>
            <Button
              variant="text"
              size="small"
              onClick={handleProvisionDefaults}
              disabled={provisioning}
              startIcon={provisioning ? <CircularProgress size={14} /> : null}
            >
              Cargos padrão
            </Button>
            <Button variant="contained" size="small" onClick={() => openForm(null)}>
              Novo cargo
            </Button>
          </>
        }
      />

      {error && <ErrorBanner message={error} />}

      <SectionCard padding={0}>
        {!loading && positions.length === 0 && !error ? (
          <EmptyState
            title="Nenhum cargo cadastrado"
            description="Crie os cargos da escola ou comece pelo conjunto padrão."
            action={
              <Button
                variant="contained"
                size="small"
                onClick={handleProvisionDefaults}
                disabled={provisioning}
              >
                {provisioning ? 'Criando...' : 'Criar cargos padrão'}
              </Button>
            }
          />
        ) : (
          <Box px={3.5} py={3.5} sx={{ height: 594, width: 1 }}>
            <DataTable
              rows={positions}
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
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{editing ? 'Editar cargo' : 'Novo cargo'}</DialogTitle>
        <Stack component="form" onSubmit={handleSubmit} direction="column" noValidate>
          <DialogContent>
            <TextField
              id="job-position-name"
              name="name"
              label="Nome do cargo"
              placeholder="Professor(a), Secretária, Diretor(a)..."
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameError('');
              }}
              error={Boolean(nameError)}
              helperText={nameError}
              disabled={saving}
              variant="filled"
              fullWidth
              autoFocus
              required
            />
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
        title="Excluir cargo"
        message={`Excluir ${pendingDelete?.name ?? ''}? Ele deixa de aparecer no cadastro de colaboradores.`}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </Stack>
  );
};

export default JobPositions;
