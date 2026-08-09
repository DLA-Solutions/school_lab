import { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import IconifyIcon from 'components/base/IconifyIcon';
import GuardianFormDialog from 'components/sections/people/guardians/GuardianFormDialog';
import { ConfirmDialog, DataTable, EmptyState, ErrorBanner, PageHeader, SectionCard } from 'design-system';
import { useCurrentSchool } from 'providers/useCurrentSchool';
import { ApiError } from 'services/api';
import { deleteGuardian, listGuardians } from 'services/guardiansApi';
import { Guardian } from 'types/guardian';

// The API paginates with Pagy at a fixed 25 per page and takes no page-size parameter, so the
// grid follows the server rather than offering a page-size selector it could not honour.
const PAGE_SIZE = 25;

// Optional columns come back as NULL for guardians registered with a name only.
const renderOptional = ({ value }: GridRenderCellParams<Guardian, string | null>) =>
  value ? (
    <Typography variant="body2">{value}</Typography>
  ) : (
    <Typography variant="body2" color="text.secondary">
      —
    </Typography>
  );

const Guardians = () => {
  const school = useCurrentSchool();
  const schoolId = school?.school_id ?? null;

  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0); // zero-based, as the grid counts
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Guardian | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Guardian | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!schoolId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await listGuardians({ schoolId, page: page + 1 });
      setGuardians(response.data);
      setTotal(response.meta.total);
    } catch (err) {
      setGuardians([]);
      setTotal(0);
      setError(
        err instanceof ApiError
          ? err.message
          : 'Não foi possível carregar os responsáveis. Verifique sua conexão.',
      );
    } finally {
      setLoading(false);
    }
  }, [schoolId, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleEdit = (guardian: Guardian) => {
    setEditing(guardian);
    setFormOpen(true);
  };

  const handleSaved = () => {
    setFormOpen(false);
    setEditing(null);
    // A new guardian is ordered by name, so it may land on any page — refetch instead of
    // splicing it into the current one.
    load();
  };

  const handleConfirmDelete = async () => {
    if (!schoolId || !pendingDelete) {
      return;
    }

    setDeleting(true);

    try {
      await deleteGuardian(schoolId, pendingDelete.id);
      setPendingDelete(null);

      // Stepping back off a page that just lost its only row keeps the grid from showing empty.
      if (guardians.length === 1 && page > 0) {
        setPage(page - 1);
      } else {
        load();
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Não foi possível excluir o responsável. Tente novamente.',
      );
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const columns: GridColDef<Guardian>[] = [
    { field: 'name', headerName: 'Nome', flex: 1, minWidth: 200 },
    { field: 'cpf', headerName: 'CPF', width: 160, renderCell: renderOptional },
    { field: 'email', headerName: 'E-mail', flex: 1, minWidth: 200, renderCell: renderOptional },
    { field: 'phone', headerName: 'Telefone', width: 160, renderCell: renderOptional },
    {
      field: 'actions',
      headerName: 'Ações',
      width: 120,
      sortable: false,
      filterable: false,
      align: 'right',
      headerAlign: 'right',
      renderCell: ({ row }: GridRenderCellParams<Guardian>) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end" height={1}>
          <Tooltip title="Editar">
            <IconButton
              size="small"
              aria-label={`Editar ${row.name}`}
              onClick={() => handleEdit(row)}
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

  // Every People endpoint is gated by `school_staff?`, so a user signed in only as a guardian
  // would get a 403 on load. Say so up front instead of rendering an empty grid.
  if (!school) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title="Responsáveis" />
        <SectionCard>
          <EmptyState
            title="Sem acesso a esta área"
            description="O cadastro de responsáveis está disponível apenas para usuários com vínculo ativo de escola."
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader
        title="Responsáveis"
        subtitle={school.school_name ?? undefined}
        actions={
          <Button variant="contained" size="small" onClick={handleCreate}>
            Novo responsável
          </Button>
        }
      />

      {error && <ErrorBanner message={error} />}

      <SectionCard padding={0}>
        {!loading && guardians.length === 0 && !error ? (
          <EmptyState
            title="Nenhum responsável cadastrado"
            description="Cadastre o primeiro responsável para vinculá-lo a alunos e cobranças."
            action={
              <Button variant="contained" size="small" onClick={handleCreate}>
                Novo responsável
              </Button>
            }
          />
        ) : (
          <Box px={3.5} py={3.5} sx={{ height: 594, width: 1 }}>
            <DataTable
              rows={guardians}
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

      {/* The key remounts the dialog each time it opens (and when the edited row changes), which
          is what clears the form — while keeping it mounted on close so the exit transition runs. */}
      <GuardianFormDialog
        key={`${formOpen}-${editing?.id ?? 'new'}`}
        open={formOpen}
        schoolId={school.school_id}
        guardian={editing}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Excluir responsável"
        message={`Excluir ${pendingDelete?.name ?? ''}? Ele deixa de aparecer na listagem, mas o histórico de cobranças é preservado.`}
        confirmLabel={deleting ? 'Excluindo...' : 'Excluir'}
        cancelLabel="Cancelar"
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </Stack>
  );
};

export default Guardians;
