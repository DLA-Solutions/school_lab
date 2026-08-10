import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import MembershipPermissionsDialog from 'components/sections/people/team/MembershipPermissionsDialog';
import {
  DataTable,
  EmptyState,
  ErrorBanner,
  PageHeader,
  SectionCard,
  SemanticChip,
} from 'design-system';
import { useCurrentSchool } from 'providers/useCurrentSchool';
import { ApiError } from 'services/api';
import { listMemberships } from 'services/peopleApi';
import { TeamMembership } from 'types/people';

const PAGE_SIZE = 25;

const STAFF_ROLES = new Set(['staff', 'teacher']);

const statusLabel = (status: string) => {
  switch (status) {
    case 'active':
      return 'Ativo';
    case 'invited':
      return 'Convidado';
    case 'suspended':
      return 'Suspenso';
    default:
      return status;
  }
};

const statusVariant = (status: string): 'success' | 'warning' | 'error' | 'info' => {
  switch (status) {
    case 'active':
      return 'success';
    case 'invited':
      return 'info';
    case 'suspended':
      return 'error';
    default:
      return 'warning';
  }
};

const roleLabel = (role: string) => {
  switch (role) {
    case 'staff':
      return 'Equipe';
    case 'teacher':
      return 'Professor';
    default:
      return role;
  }
};

const Team = () => {
  const school = useCurrentSchool();
  const schoolId = school?.school_id ?? null;
  const isOwner = school?.is_owner === true;

  const [memberships, setMemberships] = useState<TeamMembership[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [permissionsFor, setPermissionsFor] = useState<TeamMembership | null>(null);

  const load = useCallback(async () => {
    if (!schoolId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await listMemberships(schoolId, page + 1);
      const staffOnly = response.data.filter((row) => STAFF_ROLES.has(row.role));
      setMemberships(staffOnly);
      setTotal(response.meta.total);
    } catch (err) {
      setMemberships([]);
      setTotal(0);
      setError(
        err instanceof ApiError
          ? err.message
          : 'Não foi possível carregar a equipe. Verifique sua conexão.',
      );
    } finally {
      setLoading(false);
    }
  }, [schoolId, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePermissionsSaved = (updated: TeamMembership) => {
    setMemberships((current) => current.map((row) => (row.id === updated.id ? updated : row)));
    setPermissionsFor(updated);
  };

  const columns: GridColDef<TeamMembership>[] = useMemo(
    () => [
      {
        field: 'email',
        headerName: 'E-mail',
        flex: 1,
        minWidth: 200,
        valueGetter: (_value, row) => row.email ?? '—',
      },
      {
        field: 'display_title',
        headerName: 'Cargo',
        flex: 1,
        minWidth: 150,
        valueGetter: (_value, row) => row.display_title ?? '—',
      },
      {
        field: 'role_template',
        headerName: 'Template',
        flex: 1,
        minWidth: 150,
        sortable: false,
        valueGetter: (_value, row) => row.role_template?.name ?? '—',
      },
      {
        field: 'role',
        headerName: 'Papel',
        width: 130,
        valueGetter: (_value, row) => roleLabel(row.role),
      },
      {
        field: 'status',
        headerName: 'Situação',
        width: 130,
        sortable: false,
        renderCell: ({ row }: GridRenderCellParams<TeamMembership>) => (
          <SemanticChip variant={statusVariant(row.status)} label={statusLabel(row.status)} />
        ),
      },
      {
        field: 'actions',
        headerName: 'Ações',
        width: 140,
        sortable: false,
        filterable: false,
        align: 'right',
        headerAlign: 'right',
        renderCell: ({ row }: GridRenderCellParams<TeamMembership>) =>
          isOwner && !row.is_owner ? (
            <Button
              size="small"
              variant="outlined"
              disabled={row.status === 'suspended'}
              onClick={() => setPermissionsFor(row)}
            >
              Permissões
            </Button>
          ) : null,
      },
    ],
    [isOwner],
  );

  if (!school) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title="Equipe" />
        <SectionCard>
          <EmptyState
            title="Sem acesso a esta área"
            description="A listagem da equipe está disponível apenas para usuários com vínculo ativo de escola."
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader title="Equipe" />

      {error && <ErrorBanner message={error} />}

      <SectionCard padding={0}>
        {!loading && memberships.length === 0 && !error ? (
          <EmptyState
            title="Nenhum membro da equipe"
            description="Convide colaboradores durante o onboarding ou peça ao proprietário para adicionar contas de equipe."
            headingLevel={2}
          />
        ) : (
          <Box px={3.5} py={3.5} sx={{ height: 594, width: 1 }}>
            <DataTable
              rows={memberships}
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

      {permissionsFor && schoolId && (
        <MembershipPermissionsDialog
          open
          schoolId={schoolId}
          membership={permissionsFor}
          onClose={() => setPermissionsFor(null)}
          onSaved={handlePermissionsSaved}
        />
      )}
    </Stack>
  );
};

export default Team;
