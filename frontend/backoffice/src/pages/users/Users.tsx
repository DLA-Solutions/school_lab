import { ChangeEvent, KeyboardEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
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
  SearchField,
  SectionCard,
  SemanticChip,
} from 'design-system';
import { useAuth } from 'providers/AuthContext';
import { ApiError } from 'services/api';
import {
  disableUser,
  enableUser,
  listUsers,
  UserListFilters,
} from 'services/usersApi';
import { PlatformUser, UserStatus } from 'types/user';

const PAGE_SIZE = 25;
const ALL_FILTER = 'all';
type StatusFilter = UserStatus | typeof ALL_FILTER;

const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  all: 'Todos',
  active: 'Ativo',
  disabled: 'Desativado',
};

const STATUS_CHIP: Record<UserStatus, { label: string; variant: 'success' | 'error' }> = {
  active: { label: 'Ativo', variant: 'success' },
  disabled: { label: 'Desativado', variant: 'error' },
};

const ROLE_LABELS: Record<string, string> = {
  backoffice: 'Backoffice',
  school: 'Admin da escola',
  staff: 'Colaborador',
  teacher: 'Professor',
  guardian: 'Responsável',
};

const formatMembership = (membership: PlatformUser['memberships'][number]) => {
  const roleLabel = ROLE_LABELS[membership.role] ?? membership.role;

  if (membership.role === 'backoffice' || !membership.school_name) {
    return roleLabel;
  }

  return `${roleLabel} — ${membership.school_name}`;
};

/**
 * Platform user register — search, list, and disable/enable accounts for backoffice operators.
 */
const Users = () => {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(ALL_FILTER);

  const [pendingDisable, setPendingDisable] = useState<PlatformUser | null>(null);
  const [pendingEnable, setPendingEnable] = useState<PlatformUser | null>(null);
  const [actionError, setActionError] = useState('');

  const listFilters = useMemo<UserListFilters>(
    () => ({
      q: searchQuery,
      status: statusFilter === ALL_FILTER ? '' : statusFilter,
    }),
    [searchQuery, statusFilter],
  );

  const hasActiveFilters = Boolean(searchQuery) || statusFilter !== ALL_FILTER;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await listUsers(page + 1, listFilters);
      setUsers(response.data);
      setTotal(response.meta.total);
    } catch (err) {
      setUsers([]);
      setTotal(0);

      if (err instanceof ApiError && err.status === 403) {
        setForbidden(true);
      } else {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Não foi possível carregar os usuários. Verifique sua conexão.',
        );
      }
    } finally {
      setLoading(false);
    }
  }, [listFilters, page]);

  useEffect(() => {
    setPage(0);
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchInput(event.target.value);
  };

  const handleSearchSubmit = () => {
    setSearchQuery(searchInput.trim());
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearchSubmit();
    }
  };

  const handleConfirmDisable = async () => {
    if (!pendingDisable) {
      return;
    }

    setActionError('');

    try {
      await disableUser(pendingDisable.id);
      setPendingDisable(null);
      load();
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : 'Não foi possível desativar o usuário.',
      );
      setPendingDisable(null);
    }
  };

  const handleConfirmEnable = async () => {
    if (!pendingEnable) {
      return;
    }

    setActionError('');

    try {
      await enableUser(pendingEnable.id);
      setPendingEnable(null);
      load();
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : 'Não foi possível reativar o usuário.',
      );
      setPendingEnable(null);
    }
  };

  const isCurrentUser = (row: PlatformUser) => row.id === currentUser?.id;

  const columns: GridColDef<PlatformUser>[] = [
    { field: 'email', headerName: 'E-mail', flex: 1, minWidth: 240 },
    {
      field: 'memberships',
      headerName: 'Vínculos',
      flex: 1,
      minWidth: 220,
      sortable: false,
      filterable: false,
      renderCell: ({ row }: GridRenderCellParams<PlatformUser>) => {
        if (row.memberships.length === 0) {
          return (
            <Typography variant="body2" color="text.secondary">
              —
            </Typography>
          );
        }

        return (
          <Stack spacing={0.25} justifyContent="center" height={1}>
            {row.memberships.map((membership, index) => (
              <Typography key={`${membership.role}-${index}`} variant="body2">
                {formatMembership(membership)}
              </Typography>
            ))}
          </Stack>
        );
      },
    },
    {
      field: 'status',
      headerName: 'Situação',
      width: 140,
      sortable: false,
      filterable: false,
      renderCell: ({ row }: GridRenderCellParams<PlatformUser>) => {
        const meta = STATUS_CHIP[row.status];

        return <SemanticChip variant={meta.variant} label={meta.label} />;
      },
    },
    {
      field: 'actions',
      headerName: 'Ações',
      width: 120,
      sortable: false,
      filterable: false,
      align: 'right',
      headerAlign: 'right',
      renderCell: ({ row }: GridRenderCellParams<PlatformUser>) => {
        if (isCurrentUser(row)) {
          return (
            <Typography variant="body2" color="text.secondary">
              Você
            </Typography>
          );
        }

        if (row.status === 'disabled') {
          return (
            <Tooltip title="Reativar usuário">
              <IconButton
                size="small"
                aria-label={`Reativar ${row.email}`}
                onClick={() => setPendingEnable(row)}
                color="success"
              >
                <IconifyIcon icon="mingcute:check-circle-line" />
              </IconButton>
            </Tooltip>
          );
        }

        return (
          <Tooltip title="Desativar usuário">
            <IconButton
              size="small"
              aria-label={`Desativar ${row.email}`}
              onClick={() => setPendingDisable(row)}
              color="error"
            >
              <IconifyIcon icon="mingcute:forbid-circle-line" />
            </IconButton>
          </Tooltip>
        );
      },
    },
  ];

  if (forbidden) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title="Usuários" />
        <SectionCard>
          <EmptyState
            title="Sem acesso a esta área"
            description="Gestão de usuários da plataforma."
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader
        title="Usuários"
        subtitle="Desative ou reative contas em toda a plataforma."
        actions={
          <Stack direction="row" spacing={1.5} alignItems="center">
            <SearchField
              value={searchInput}
              onChange={handleSearchChange}
              placeholder="Buscar por e-mail"
              ariaLabel="Buscar usuários por e-mail"
              onKeyDown={handleSearchKeyDown}
            />
            <TextField
              id="user-status-filter"
              label="Situação"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              select
              size="small"
              variant="filled"
              sx={{ width: 170 }}
            >
              {(Object.keys(STATUS_FILTER_LABELS) as StatusFilter[]).map((value) => (
                <MenuItem key={value} value={value}>
                  {STATUS_FILTER_LABELS[value]}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        }
      />

      {error && <ErrorBanner message={error} />}
      {actionError && <ErrorBanner message={actionError} />}

      <SectionCard padding={0}>
        {!loading && users.length === 0 && !error ? (
          <EmptyState
            title={hasActiveFilters ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}
            description={
              hasActiveFilters
                ? 'Nenhum usuário corresponde à busca ou ao filtro selecionado.'
                : 'Ainda não há usuários registrados na plataforma.'
            }
          />
        ) : (
          <Box px={3.5} py={3.5} sx={{ height: 594, width: 1 }}>
            <DataTable
              rows={users}
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

      <ConfirmDialog
        open={Boolean(pendingDisable)}
        title="Desativar usuário"
        message={`Desativar ${pendingDisable?.email ?? ''}? A conta não poderá obter novas sessões e os tokens ativos serão revogados.`}
        confirmLabel="Desativar"
        cancelLabel="Cancelar"
        destructive
        onConfirm={handleConfirmDisable}
        onCancel={() => setPendingDisable(null)}
      />

      <ConfirmDialog
        open={Boolean(pendingEnable)}
        title="Reativar usuário"
        message={`Reativar ${pendingEnable?.email ?? ''}? A conta voltará a poder autenticar na plataforma.`}
        confirmLabel="Reativar"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmEnable}
        onCancel={() => setPendingEnable(null)}
      />
    </Stack>
  );
};

export default Users;
