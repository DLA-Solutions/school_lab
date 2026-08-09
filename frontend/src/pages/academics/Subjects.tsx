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
import { createSubject, deleteSubject, listSubjects, updateSubject } from 'services/academicsApi';
import { ApiError } from 'services/api';
import { Subject } from 'types/academics';

const PAGE_SIZE = 25;

const Subjects = () => {
  const school = useCurrentSchool();
  const schoolId = school?.school_id ?? null;

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Subject | null>(null);

  const load = useCallback(async () => {
    if (!schoolId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await listSubjects(schoolId, page + 1);
      setSubjects(response.data);
      setTotal(response.meta.total);
    } catch (err) {
      setSubjects([]);
      setTotal(0);
      setError(
        err instanceof ApiError
          ? err.message
          : 'Não foi possível carregar as matérias. Verifique sua conexão.',
      );
    } finally {
      setLoading(false);
    }
  }, [schoolId, page]);

  useEffect(() => {
    load();
  }, [load]);

  const openForm = (subject: Subject | null) => {
    setEditing(subject);
    setName(subject?.name ?? '');
    setNameError('');
    setFormOpen(true);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!schoolId) {
      return;
    }

    if (!name.trim()) {
      setNameError('Informe o nome da matéria.');
      return;
    }

    setSaving(true);

    try {
      if (editing) {
        await updateSubject(schoolId, editing.id, name.trim());
      } else {
        await createSubject(schoolId, name.trim());
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

  const handleConfirmDelete = async () => {
    if (!schoolId || !pendingDelete) {
      return;
    }

    try {
      await deleteSubject(schoolId, pendingDelete.id);
      setPendingDelete(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível excluir a matéria.');
      setPendingDelete(null);
    }
  };

  const columns: GridColDef<Subject>[] = [
    { field: 'name', headerName: 'Matéria', flex: 1, minWidth: 220 },
    {
      field: 'actions',
      headerName: 'Ações',
      width: 110,
      sortable: false,
      filterable: false,
      align: 'right',
      headerAlign: 'right',
      renderCell: ({ row }: GridRenderCellParams<Subject>) => (
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

  if (!school) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title="Matérias" />
        <SectionCard>
          <EmptyState
            title="Sem acesso a esta área"
            description="O cadastro de matérias está disponível apenas para usuários com vínculo ativo de escola."
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader
        title="Matérias"
        subtitle={school.school_name ?? undefined}
        actions={
          <Button variant="contained" size="small" onClick={() => openForm(null)}>
            Nova matéria
          </Button>
        }
      />

      {error && <ErrorBanner message={error} />}

      <SectionCard padding={0}>
        {!loading && subjects.length === 0 && !error ? (
          <EmptyState
            title="Nenhuma matéria cadastrada"
            description="Cadastre as matérias para atribuí-las aos professores em cada turma."
            action={
              <Button variant="contained" size="small" onClick={() => openForm(null)}>
                Nova matéria
              </Button>
            }
          />
        ) : (
          <Box px={3.5} py={3.5} sx={{ height: 594, width: 1 }}>
            <DataTable
              rows={subjects}
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
        <DialogTitle>{editing ? 'Editar matéria' : 'Nova matéria'}</DialogTitle>
        <Stack component="form" onSubmit={handleSubmit} direction="column" noValidate>
          <DialogContent>
            <TextField
              id="subject-name"
              name="name"
              label="Nome"
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
        title="Excluir matéria"
        message={`Excluir ${pendingDelete?.name ?? ''}? Ela deixa de aparecer nas turmas e nas atribuições dos professores.`}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </Stack>
  );
};

export default Subjects;
