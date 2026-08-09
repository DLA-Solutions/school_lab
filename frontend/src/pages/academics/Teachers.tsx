import { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import IconifyIcon from 'components/base/IconifyIcon';
import TeacherAssignmentsDialog from 'components/sections/academics/TeacherAssignmentsDialog';
import TeacherFormDialog from 'components/sections/academics/TeacherFormDialog';
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
import { deleteTeacher, listTeachers } from 'services/academicsApi';
import { Teacher } from 'types/academics';
import { formatCpf } from 'utils/documentNumber';
import { gradeLevelLabel } from 'utils/gradeLevels';

const PAGE_SIZE = 25;

const renderCpf = ({ value }: GridRenderCellParams<Teacher, string>) => (
  <Typography variant="body2">{formatCpf(value)}</Typography>
);

/**
 * One chip per class, labelled with the subjects held there — the listing's whole point is to
 * answer "which classes, and which subjects in each" without opening a row.
 */
const renderClasses = ({ row }: GridRenderCellParams<Teacher>) => {
  if (row.classes.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        Sem turmas
      </Typography>
    );
  }

  return (
    <Stack direction="row" gap={0.75} flexWrap="wrap" alignItems="center" height={1} py={1}>
      {row.classes.map((schoolClass) => (
        <Tooltip
          key={schoolClass.id}
          title={schoolClass.subjects.map((subject) => subject.name).join(', ')}
        >
          <Chip
            size="small"
            variant="outlined"
            label={`${gradeLevelLabel(schoolClass.grade_level)} ${schoolClass.name}: ${schoolClass.subjects
              .map((subject) => subject.name)
              .join(', ')}`}
          />
        </Tooltip>
      ))}
    </Stack>
  );
};

const Teachers = () => {
  const school = useCurrentSchool();
  const schoolId = school?.school_id ?? null;

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [assignmentsFor, setAssignmentsFor] = useState<Teacher | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Teacher | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!schoolId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await listTeachers({ schoolId, page: page + 1 });
      setTeachers(response.data);
      setTotal(response.meta.total);
    } catch (err) {
      setTeachers([]);
      setTotal(0);
      setError(
        err instanceof ApiError
          ? err.message
          : 'Não foi possível carregar os professores. Verifique sua conexão.',
      );
    } finally {
      setLoading(false);
    }
  }, [schoolId, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleConfirmDelete = async () => {
    if (!schoolId || !pendingDelete) {
      return;
    }

    setDeleting(true);

    try {
      await deleteTeacher(schoolId, pendingDelete.id);
      setPendingDelete(null);

      if (teachers.length === 1 && page > 0) {
        setPage(page - 1);
      } else {
        load();
      }
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Não foi possível excluir o professor.',
      );
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const columns: GridColDef<Teacher>[] = [
    { field: 'name', headerName: 'Nome', width: 180 },
    { field: 'cpf', headerName: 'CPF', width: 150, renderCell: renderCpf },
    { field: 'email', headerName: 'E-mail', width: 200 },
    {
      field: 'classes',
      headerName: 'Turmas e matérias',
      flex: 1,
      minWidth: 280,
      sortable: false,
      renderCell: renderClasses,
    },
    {
      field: 'actions',
      headerName: 'Ações',
      width: 150,
      sortable: false,
      filterable: false,
      align: 'right',
      headerAlign: 'right',
      renderCell: ({ row }: GridRenderCellParams<Teacher>) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end" height={1}>
          <Tooltip title="Turmas e matérias">
            <IconButton
              size="small"
              aria-label={`Turmas de ${row.name}`}
              onClick={() => setAssignmentsFor(row)}
            >
              <IconifyIcon icon="mingcute:book-2-line" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Editar">
            <IconButton
              size="small"
              aria-label={`Editar ${row.name}`}
              onClick={() => {
                setEditing(row);
                setFormOpen(true);
              }}
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

  if (!school) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title="Professores" />
        <SectionCard>
          <EmptyState
            title="Sem acesso a esta área"
            description="O cadastro de professores está disponível apenas para usuários com vínculo ativo de escola."
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader
        title="Professores"
        subtitle={school.school_name ?? undefined}
        actions={
          <Button
            variant="contained"
            size="small"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Novo professor
          </Button>
        }
      />

      {error && <ErrorBanner message={error} />}

      <SectionCard padding={0}>
        {!loading && teachers.length === 0 && !error ? (
          <EmptyState
            title="Nenhum professor cadastrado"
            description="Cadastre um professor para depois atribuí-lo às turmas e matérias."
            action={
              <Button
                variant="contained"
                size="small"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                Novo professor
              </Button>
            }
          />
        ) : (
          <Box px={3.5} py={3.5} sx={{ height: 594, width: 1 }}>
            <DataTable
              rows={teachers}
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

      <TeacherFormDialog
        key={`${formOpen}-${editing?.id ?? 'new'}`}
        open={formOpen}
        schoolId={school.school_id}
        teacher={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          setEditing(null);
          load();
        }}
      />

      {assignmentsFor && (
        <TeacherAssignmentsDialog
          open
          schoolId={school.school_id}
          teacher={assignmentsFor}
          onClose={() => setAssignmentsFor(null)}
          onChanged={load}
        />
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Excluir professor"
        message={`Excluir ${pendingDelete?.name ?? ''}? Ele deixa de aparecer na listagem e perde suas turmas.`}
        confirmLabel={deleting ? 'Excluindo...' : 'Excluir'}
        cancelLabel="Cancelar"
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </Stack>
  );
};

export default Teachers;
