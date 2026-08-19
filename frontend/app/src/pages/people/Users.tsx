import { useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import MembershipPermissionsDialog from 'components/sections/people/users/MembershipPermissionsDialog';
import UserFormDialog from 'components/sections/people/users/UserFormDialog';
import {
  DataTable,
  EmptyState,
  ErrorBanner,
  PageHeader,
  SectionCard,
  SemanticChip,
} from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { useCurrentSchool } from 'providers/useCurrentSchool';
import { ApiError } from 'services/api';
import { listMemberships, resendMembershipInvite } from 'services/peopleApi';
import { TeamMembership } from 'types/people';

const PAGE_SIZE = 25;

const Users = () => {
  const { t } = useTranslation();
  const school = useCurrentSchool();
  const schoolId = school?.school_id ?? null;
  const isOwner = school?.is_owner === true;

  const [memberships, setMemberships] = useState<TeamMembership[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [permissionsFor, setPermissionsFor] = useState<TeamMembership | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [resendingId, setResendingId] = useState<number | null>(null);
  const [notice, setNotice] = useState('');

  const statusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return t('common.activeStatus');
      case 'invited':
        return t('common.invited');
      case 'suspended':
        return t('common.suspended');
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
        return t('common.staffRole');
      case 'teacher':
        return t('common.teacherRole');
      case 'guardian':
        return t('users.role.guardian');
      default:
        return role;
    }
  };

  const load = useCallback(async () => {
    if (!schoolId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await listMemberships(schoolId, page + 1);
      // Toda conta, família inclusive: a pergunta desta tela é quem consegue entrar, e um
      // responsável que não consegue é exatamente a linha que alguém vem procurar aqui.
      setMemberships(response.data);
      setTotal(response.meta.total);
    } catch (err) {
      setMemberships([]);
      setTotal(0);
      setError(err instanceof ApiError ? err.message : t('users.loadError'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, page, t]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreated = (created: TeamMembership) => {
    setFormOpen(false);
    setNotice(t('users.inviteSent', { email: created.email ?? '' }));
    load();
  };

  // Um convite que se perdeu na caixa de spam é o motivo mais comum de alguém não conseguir
  // entrar; reenviar é mais barato do que investigar.
  const handleResend = async (membership: TeamMembership) => {
    setResendingId(membership.id);
    setError('');

    try {
      await resendMembershipInvite(schoolId!, membership.id);
      setNotice(t('users.inviteSent', { email: membership.email ?? '' }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('users.inviteError'));
    } finally {
      setResendingId(null);
    }
  };

  const handlePermissionsSaved = (updated: TeamMembership) => {
    setMemberships((current) => current.map((row) => (row.id === updated.id ? updated : row)));
    setPermissionsFor(updated);
  };

  const columns: GridColDef<TeamMembership>[] = [
      {
        field: 'email',
        headerName: t('common.email'),
        flex: 1,
        minWidth: 200,
        valueGetter: (_value, row) => row.email ?? '—',
      },
      {
        field: 'display_title',
        headerName: t('common.position'),
        flex: 1,
        minWidth: 150,
        valueGetter: (_value, row) => row.display_title ?? '—',
      },
      {
        field: 'role_template',
        headerName: t('common.template'),
        flex: 1,
        minWidth: 150,
        sortable: false,
        valueGetter: (_value, row) => row.role_template?.name ?? '—',
      },
      {
        field: 'role',
        headerName: t('common.role'),
        width: 130,
        valueGetter: (_value, row) => roleLabel(row.role),
      },
      {
        field: 'status',
        headerName: t('common.status'),
        width: 130,
        sortable: false,
        renderCell: ({ row }: GridRenderCellParams<TeamMembership>) => (
          <SemanticChip variant={statusVariant(row.status)} label={statusLabel(row.status)} />
        ),
      },
      {
        field: 'actions',
        headerName: t('common.actions'),
        width: 230,
        sortable: false,
        filterable: false,
        align: 'right',
        headerAlign: 'right',
        renderCell: ({ row }: GridRenderCellParams<TeamMembership>) => (
          <Stack direction="row" gap={1} justifyContent="flex-end" alignItems="center" height={1}>
            {/* Reenviar só faz sentido enquanto o convite não foi aceito. */}
            {row.status === 'invited' && (
              <Button
                size="small"
                disabled={resendingId === row.id}
                onClick={() => handleResend(row)}
              >
                {t('users.resendInvite')}
              </Button>
            )}
            {isOwner && !row.is_owner && (
              <Button
                size="small"
                variant="outlined"
                disabled={row.status === 'suspended'}
                onClick={() => setPermissionsFor(row)}
              >
                {t('common.permissions')}
              </Button>
            )}
          </Stack>
        ),
      },
  ];

  if (!school) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title={t('users.title')} />
        <SectionCard>
          <EmptyState
            title={t('common.noAccess.title')}
            description={t('users.noAccess.description')}
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader
        title={t('users.title')}
        actions={
          <Button variant="contained" size="small" onClick={() => setFormOpen(true)}>
            {t('users.new')}
          </Button>
        }
      />

      {error && <ErrorBanner message={error} />}
      {notice && <Alert severity="success" onClose={() => setNotice('')}>{notice}</Alert>}

      <SectionCard padding={0}>
        {!loading && memberships.length === 0 && !error ? (
          <EmptyState
            title={t('users.empty.title')}
            description={t('users.empty.description')}
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
              rangeLabel={({ from, to, count }) => t('common.range', { from, to, count })}
            />
          </Box>
        )}
      </SectionCard>

      {schoolId && (
        <UserFormDialog
          open={formOpen}
          schoolId={schoolId}
          onClose={() => setFormOpen(false)}
          onCreated={handleCreated}
        />
      )}

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

export default Users;
