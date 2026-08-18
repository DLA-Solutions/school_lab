import { ChangeEvent, KeyboardEvent, SyntheticEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import Box from '@mui/material/Box';
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
} from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { useAuth } from 'providers/AuthContext';
import { ApiError } from 'services/api';
import { listOperators } from 'services/operatorsApi';
import {
  disableUser,
  enableUser,
  listUsers,
  UserListFilters,
} from 'services/usersApi';
import { PlatformOperator } from 'types/operator';
import { PlatformUser, UserStatus } from 'types/user';
import { canManageBackofficeOps } from 'utils/platformPermissions';

const PAGE_SIZE = 25;
const ALL_FILTER = 'all';
type StatusFilter = UserStatus | typeof ALL_FILTER;
type UsersTab = 'users' | 'operators';

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

const parseUsersTab = (value: string | null, showOperatorsTab: boolean): UsersTab =>
  value === 'operators' && showOperatorsTab ? 'operators' : 'users';

/**
 * Platform user register — search, list, and disable/enable accounts for backoffice operators.
 */
const Users = () => {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const showOperatorsTab = canManageBackofficeOps(currentUser);

  const [activeTab, setActiveTab] = useState<UsersTab>(() =>
    parseUsersTab(searchParams.get('tab'), showOperatorsTab),
  );

  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [operators, setOperators] = useState<PlatformOperator[]>([]);
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

  useEffect(() => {
    if (activeTab === 'operators' && !showOperatorsTab) {
      setActiveTab('users');
    }
  }, [activeTab, showOperatorsTab]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError('');
      setForbidden(false);

      try {
        if (activeTab === 'operators') {
          const response = await listOperators(page + 1);
          if (!cancelled) {
            setOperators(response.data);
            setTotal(response.meta.total);
            setUsers([]);
          }
        } else {
          const response = await listUsers(page + 1, listFilters);
          if (!cancelled) {
            setUsers(response.data);
            setTotal(response.meta.total);
            setOperators([]);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setUsers([]);
          setOperators([]);
          setTotal(0);

          if (err instanceof ApiError && err.status === 403) {
            if (activeTab === 'users') {
              setForbidden(true);
            } else {
              setError(err.message);
            }
          } else {
            setError(
              err instanceof ApiError
                ? err.message
                : activeTab === 'operators'
                  ? 'Não foi possível carregar os operadores. Verifique sua conexão.'
                  : 'Não foi possível carregar os usuários. Verifique sua conexão.',
            );
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [activeTab, listFilters, page]);

  useEffect(() => {
    setPage(0);
  }, [searchQuery, statusFilter, activeTab]);

  useEffect(() => {
    const params = new URLSearchParams();

    if (activeTab === 'operators') {
      params.set('tab', 'operators');
    }

    setSearchParams(params, { replace: true });
  }, [activeTab, setSearchParams]);

  const reload = async () => {
    setLoading(true);
    setError('');
    setForbidden(false);

    try {
      if (activeTab === 'operators') {
        const response = await listOperators(page + 1);
        setOperators(response.data);
        setTotal(response.meta.total);
      } else {
        const response = await listUsers(page + 1, listFilters);
        setUsers(response.data);
        setTotal(response.meta.total);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível atualizar a lista.');
    } finally {
      setLoading(false);
    }
  };

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
      await reload();
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
      await reload();
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : 'Não foi possível reativar o usuário.',
      );
      setPendingEnable(null);
    }
  };

  const handleTabChange = (_event: SyntheticEvent, value: UsersTab) => {
    setActiveTab(value);
    setError('');
    setForbidden(false);
  };

  const isCurrentUser = (row: PlatformUser) => row.id === currentUser?.id;

  const operatorColumns: GridColDef<PlatformOperator>[] = [
    { field: 'email', headerName: 'E-mail', flex: 1, minWidth: 240 },
    {
      field: 'status',
      headerName: 'Situação',
      width: 140,
      sortable: false,
      filterable: false,
      renderCell: ({ row }: GridRenderCellParams<PlatformOperator>) => {
        const meta = STATUS_CHIP[row.status];

        return <SemanticChip variant={meta.variant} label={meta.label} />;
      },
    },
    {
      field: 'platform_permissions',
      headerName: t('backoffice.users.permissions'),
      flex: 1,
      minWidth: 260,
      sortable: false,
      filterable: false,
      renderCell: ({ row }: GridRenderCellParams<PlatformOperator>) => {
        if (row.platform_permissions.length === 0) {
          return (
            <Typography variant="body2" color="text.secondary">
              {t('backoffice.users.noPermissions')}
            </Typography>
          );
        }

        return (
          <Typography variant="body2" noWrap title={row.platform_permissions.join(', ')}>
            {row.platform_permissions.join(', ')}
          </Typography>
        );
      },
    },
  ];

  const userColumns: GridColDef<PlatformUser>[] = [
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

  const isOperatorsTab = activeTab === 'operators';
  const rows = isOperatorsTab ? operators : users;
  const columns = isOperatorsTab ? operatorColumns : userColumns;

  if (forbidden) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title={t('backoffice.users.title')} />
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
        title={t('backoffice.users.title')}
        subtitle={
          isOperatorsTab
            ? t('backoffice.users.operatorsSubtitle')
            : 'Desative ou reative contas em toda a plataforma.'
        }
        actions={
          !isOperatorsTab ? (
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
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
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
          ) : undefined
        }
      />

      <Tabs value={activeTab} onChange={handleTabChange}>
        <Tab value="users" label={t('backoffice.users.tab.users')} />
        {showOperatorsTab ? (
          <Tab value="operators" label={t('backoffice.users.tab.operators')} />
        ) : null}
      </Tabs>

      {error && <ErrorBanner message={error} />}
      {actionError && <ErrorBanner message={actionError} />}

      <SectionCard padding={0}>
        {!loading && rows.length === 0 && !error ? (
          <EmptyState
            title={
              isOperatorsTab
                ? 'Nenhum operador cadastrado'
                : hasActiveFilters
                  ? 'Nenhum usuário encontrado'
                  : 'Nenhum usuário cadastrado'
            }
            description={
              isOperatorsTab
                ? t('backoffice.users.operatorsSubtitle')
                : hasActiveFilters
                  ? 'Nenhum usuário corresponde à busca ou ao filtro selecionado.'
                  : 'Ainda não há usuários registrados na plataforma.'
            }
          />
        ) : (
          <Box px={3.5} py={3.5} sx={{ height: 594, width: 1 }}>
            <DataTable
              rows={rows}
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
