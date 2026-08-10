import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useSearchParams } from 'react-router';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import IconifyIcon from 'components/base/IconifyIcon';
import StudentFormDialog from 'components/sections/people/students/StudentFormDialog';
import {
  ConfirmDialog,
  DataTable,
  EmptyState,
  ErrorBanner,
  PageHeader,
  SearchField,
  SectionCard,
  SemanticChip,
} from 'design-system';
import { useCurrentSchool } from 'providers/useCurrentSchool';
import { ApiError } from 'services/api';
import { activateStudent, deleteStudent, listStudents } from 'services/studentsApi';
import { Student } from 'types/student';
import { formatCpf } from 'utils/documentNumber';
import { useDebouncedValue } from 'utils/useDebouncedValue';
import { gradeLevelLabel } from 'utils/gradeLevels';

// The API paginates with Pagy at a fixed 25 per page and takes no page-size parameter.
const PAGE_SIZE = 25;

const renderCpf = ({ value }: GridRenderCellParams<Student, string>) => (
  <Typography variant="body2">{formatCpf(value)}</Typography>
);

/** The cohort as a person reads it: "Ensino Fundamental I — 5º ano A". */
const renderClass = ({ row }: GridRenderCellParams<Student>) =>
  row.school_class_id ? (
    <Typography variant="body2">
      {`${gradeLevelLabel(row.grade_level)} ${row.school_class_name ?? ''}`.trim()}
    </Typography>
  ) : (
    <Typography variant="body2" color="text.secondary">
      Sem turma
    </Typography>
  );

const RELATIONSHIP_LABELS: Record<string, string> = {
  father: 'Pai',
  mother: 'Mãe',
  other: 'Responsável',
};

const renderGuardians = ({ row }: GridRenderCellParams<Student>) =>
  row.guardians.length === 0 ? (
    <Typography variant="body2" color="text.secondary">
      —
    </Typography>
  ) : (
    <Stack direction="column" justifyContent="center" py={1}>
      {row.guardians.map((link) => (
        <Typography key={link.link_id} variant="caption">
          {`${RELATIONSHIP_LABELS[link.relationship] ?? 'Responsável'}: ${link.name}`}
        </Typography>
      ))}
    </Stack>
  );

/** Birth dates arrive as ISO (`2015-03-10`) and are read here as pt-BR. */
const renderBirthDate = ({ value }: GridRenderCellParams<Student, string>) => {
  if (!value) {
    return (
      <Typography variant="body2" color="text.secondary">
        —
      </Typography>
    );
  }

  // Split rather than `new Date(value)`: parsing a bare ISO date as UTC and rendering it in a
  // negative-offset timezone shows the day before.
  const [year, month, day] = value.split('-');

  return <Typography variant="body2">{`${day}/${month}/${year}`}</Typography>;
};

const renderStatus = ({ value }: GridRenderCellParams<Student, Student['status']>) => (
  <SemanticChip
    variant={value === 'active' ? 'success' : 'info'}
    label={value === 'active' ? 'Ativo' : 'Transferido'}
  />
);

const Students = () => {
  const school = useCurrentSchool();
  const schoolId = school?.school_id ?? null;

  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0); // zero-based, as the grid counts
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // The term lives in the URL so it survives a reload, can be linked to, and lets the global
  // search in the menu open this listing already filtered.
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('q') ?? '';
  // The API does the filtering, so the term is debounced rather than sent per keystroke.
  const debouncedSearch = useDebouncedValue(search);
  // Which records are shown. Inactive ones have to be reachable, or there is no way to bring
  // them back.
  const activation = (searchParams.get('status') ?? 'active') as 'active' | 'inactive' | 'all';

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!schoolId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await listStudents({
        schoolId,
        page: page + 1,
        q: debouncedSearch,
        status: activation,
      });
      setStudents(response.data);
      setTotal(response.meta.total);
    } catch (err) {
      setStudents([]);
      setTotal(0);
      setError(
        err instanceof ApiError
          ? err.message
          : 'Não foi possível carregar os estudantes. Verifique sua conexão.',
      );
    } finally {
      setLoading(false);
    }
  }, [schoolId, page, debouncedSearch, activation]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;

    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (term) {
          next.set('q', term);
        } else {
          next.delete('q');
        }
        return next;
      },
      // Typing must not push a history entry per keystroke.
      { replace: true },
    );
    // A narrower result rarely has the page the user is on — start over at the first.
    setPage(0);
  };

  const handleActivationChange = (value: string) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value === 'active') {
          next.delete('status');
        } else {
          next.set('status', value);
        }
        return next;
      },
      { replace: true },
    );
    setPage(0);
  };

  const handleActivate = async (record: Student) => {
    if (!schoolId) {
      return;
    }

    setError('');

    try {
      await activateStudent(schoolId, record.id);
      load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Não foi possível ativar o estudante.',
      );
    }
  };

  const handleCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleSaved = () => {
    setFormOpen(false);
    setEditing(null);
    // Ordered by name, so a new student may land on any page — refetch rather than splice.
    load();
  };

  const handleConfirmDelete = async () => {
    if (!schoolId || !pendingDelete) {
      return;
    }

    setDeleting(true);

    try {
      await deleteStudent(schoolId, pendingDelete.id);
      setPendingDelete(null);

      if (students.length === 1 && page > 0) {
        setPage(page - 1);
      } else {
        load();
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Não foi possível excluir o estudante. Tente novamente.',
      );
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const columns: GridColDef<Student>[] = [
    { field: 'name', headerName: 'Nome', flex: 1, minWidth: 180 },
    { field: 'cpf', headerName: 'CPF', width: 150, renderCell: renderCpf },
    { field: 'rg', headerName: 'RG', width: 140 },
    {
      field: 'birth_date',
      headerName: 'Nascimento',
      width: 130,
      renderCell: renderBirthDate,
    },
    {
      field: 'grade_level',
      headerName: 'Turma',
      width: 210,
      sortable: false,
      renderCell: renderClass,
    },
    {
      field: 'guardians',
      headerName: 'Responsáveis',
      width: 200,
      sortable: false,
      renderCell: renderGuardians,
    },
    { field: 'status', headerName: 'Situação', width: 130, renderCell: renderStatus },
    {
      field: 'actions',
      headerName: 'Ações',
      width: 110,
      sortable: false,
      filterable: false,
      align: 'right',
      headerAlign: 'right',
      renderCell: ({ row }: GridRenderCellParams<Student>) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end" height={1}>
          {/* An inactive record offers only the way back. */}
          {!row.active ? (
            <Tooltip title="Ativar">
              <IconButton
                size="small"
                aria-label={`Ativar ${row.name}`}
                onClick={() => handleActivate(row)}
              >
                <IconifyIcon icon="mingcute:refresh-2-line" />
              </IconButton>
            </Tooltip>
          ) : (
            <>
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
            </>
          )}
        </Stack>
      ),
    },
  ];

  // Every People endpoint is gated by `school_staff?`, so a guardian-only user would get a 403.
  if (!school) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title="Estudantes" />
        <SectionCard>
          <EmptyState
            title="Sem acesso a esta área"
            description="O cadastro de estudantes está disponível apenas para usuários com vínculo ativo de escola."
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader
        title="Estudantes"
        actions={
          <>
            <TextField
              id="activation-filter"
              label="Situação"
              value={activation}
              onChange={(e) => handleActivationChange(e.target.value)}
              select
              size="small"
              variant="filled"
              sx={{ width: 150 }}
            >
              <MenuItem value="active">Ativos</MenuItem>
              <MenuItem value="inactive">Inativos</MenuItem>
              <MenuItem value="all">Todos</MenuItem>
            </TextField>
            <SearchField
              value={search}
              onChange={handleSearchChange}
              placeholder="Buscar por nome ou CPF"
              ariaLabel="Buscar estudantes"
              sx={{ width: 260 }}
            />
            <Button variant="contained" size="small" onClick={handleCreate}>
              Novo estudante
            </Button>
          </>
        }
      />

      {error && <ErrorBanner message={error} />}

      <SectionCard padding={0}>
        {!loading && students.length === 0 && !error ? (
          <EmptyState
            title={debouncedSearch ? 'Nenhum resultado' : 'Nenhum estudante cadastrado'}
            description={
              debouncedSearch
                ? `Nada encontrado para "${debouncedSearch}". Verifique o nome ou o CPF.`
                : 'Cadastre o primeiro estudante para matriculá-lo em uma turma e gerar contratos.'
            }
            action={
              <Button variant="contained" size="small" onClick={handleCreate}>
                Novo estudante
              </Button>
            }
          />
        ) : (
          <Box px={3.5} py={3.5} sx={{ height: 594, width: 1 }}>
            <DataTable
              rows={students}
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

      {/* The key remounts the dialog each time it opens, which is what clears the form. */}
      <StudentFormDialog
        key={`${formOpen}-${editing?.id ?? 'new'}`}
        open={formOpen}
        schoolId={school.school_id}
        student={editing}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Excluir estudante"
        message={`Excluir ${pendingDelete?.name ?? ''}? Ele deixa de aparecer na listagem, mas contratos e cobranças são preservados.`}
        confirmLabel={deleting ? 'Excluindo...' : 'Excluir'}
        cancelLabel="Cancelar"
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </Stack>
  );
};

export default Students;
