import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from 'react';
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
import { useTranslation } from 'providers/I18nContext';
import { ApiError } from 'services/api';
import {
  assignSchoolToGroup,
  createSchoolGroup,
  deleteSchoolGroup,
  listSchoolGroupSchools,
  listSchoolGroups,
  unassignSchoolFromGroup,
  updateSchoolGroup,
} from 'services/schoolGroupsApi';
import { SchoolGroup, SchoolGroupMember } from 'types/schoolGroup';

const PAGE_SIZE = 25;

type FormState = {
  name: string;
  headquarters_cnpj: string;
};

const emptyForm = (): FormState => ({
  name: '',
  headquarters_cnpj: '',
});

const formatDate = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString('pt-BR');
};

/**
 * Multi-unit school groups — CRUD for platform operators.
 */
const SchoolGroups = () => {
  const { t } = useTranslation();

  const [groups, setGroups] = useState<SchoolGroup[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolGroup | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<SchoolGroup | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const [manageGroup, setManageGroup] = useState<SchoolGroup | null>(null);
  const [memberSchools, setMemberSchools] = useState<SchoolGroupMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState('');
  const [assignSchoolId, setAssignSchoolId] = useState('');
  const [assignSaving, setAssignSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await listSchoolGroups(page + 1);
      setGroups(response.data);
      setTotal(response.meta.total);
    } catch (err) {
      setGroups([]);
      setTotal(0);

      if (err instanceof ApiError && err.status === 403) {
        setForbidden(true);
      } else {
        setError(
          err instanceof ApiError
            ? err.message
            : t('backoffice.schoolGroups.loadError'),
        );
      }
    } finally {
      setLoading(false);
    }
  }, [page, t]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (group: SchoolGroup) => {
    setEditing(group);
    setForm({
      name: group.name,
      headquarters_cnpj: group.headquarters_cnpj ?? '',
    });
    setFormError('');
    setFormOpen(true);
  };

  const closeForm = () => {
    if (!saving) {
      setFormOpen(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');

    const payload = {
      name: form.name.trim(),
      headquarters_cnpj: form.headquarters_cnpj.trim() || null,
    };

    try {
      if (editing) {
        await updateSchoolGroup(editing.id, payload);
      } else {
        await createSchoolGroup(payload);
        setPage(0);
      }

      setFormOpen(false);
      await load();
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : t('backoffice.schoolGroups.saveError'),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) {
      return;
    }

    setDeleteError('');

    try {
      await deleteSchoolGroup(pendingDelete.id);
      setPendingDelete(null);
      await load();
    } catch (err) {
      setDeleteError(
        err instanceof ApiError ? err.message : t('backoffice.schoolGroups.deleteError'),
      );
    }
  };

  const openManageSchools = async (group: SchoolGroup) => {
    setManageGroup(group);
    setMembersError('');
    setAssignSchoolId('');
    setMembersLoading(true);

    try {
      const members = await listSchoolGroupSchools(group.id);
      setMemberSchools(members);
    } catch (err) {
      setMemberSchools([]);
      setMembersError(
        err instanceof ApiError ? err.message : t('backoffice.schoolGroups.membersLoadError'),
      );
    } finally {
      setMembersLoading(false);
    }
  };

  const reloadMembers = async (groupId: number) => {
    const members = await listSchoolGroupSchools(groupId);
    setMemberSchools(members);
    await load();
  };

  const handleAssignSchool = async () => {
    if (!manageGroup || !assignSchoolId.trim()) {
      return;
    }

    setAssignSaving(true);
    setMembersError('');

    try {
      await assignSchoolToGroup(manageGroup.id, Number(assignSchoolId.trim()));
      setAssignSchoolId('');
      await reloadMembers(manageGroup.id);
    } catch (err) {
      setMembersError(
        err instanceof ApiError ? err.message : t('backoffice.schoolGroups.assignError'),
      );
    } finally {
      setAssignSaving(false);
    }
  };

  const handleUnassignSchool = async (schoolId: number) => {
    if (!manageGroup) {
      return;
    }

    setAssignSaving(true);
    setMembersError('');

    try {
      await unassignSchoolFromGroup(manageGroup.id, schoolId);
      await reloadMembers(manageGroup.id);
    } catch (err) {
      setMembersError(
        err instanceof ApiError ? err.message : t('backoffice.schoolGroups.unassignError'),
      );
    } finally {
      setAssignSaving(false);
    }
  };

  const columns: GridColDef<SchoolGroup>[] = [
    {
      field: 'name',
      headerName: t('backoffice.schoolGroups.name'),
      flex: 1,
      minWidth: 180,
    },
    {
      field: 'headquarters_cnpj',
      headerName: t('backoffice.schoolGroups.headquartersCnpj'),
      flex: 1,
      minWidth: 160,
      renderCell: renderOptionalText,
    },
    {
      field: 'schools_count',
      headerName: t('backoffice.schoolGroups.schoolsCount'),
      width: 120,
    },
    {
      field: 'created_at',
      headerName: t('backoffice.schoolGroups.createdAt'),
      width: 130,
      renderCell: ({ row }: GridRenderCellParams<SchoolGroup>) => (
        <Typography variant="body2">{formatDate(row.created_at)}</Typography>
      ),
    },
    {
      field: 'actions',
      headerName: t('backoffice.schoolGroups.actions'),
      width: 150,
      sortable: false,
      filterable: false,
      renderCell: ({ row }: GridRenderCellParams<SchoolGroup>) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title={t('backoffice.schoolGroups.manageSchools')}>
            <IconButton
              size="small"
              aria-label={t('backoffice.schoolGroups.manageSchools')}
              onClick={() => openManageSchools(row)}
            >
              <IconifyIcon icon="mingcute:school-line" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('backoffice.schoolGroups.edit')}>
            <IconButton size="small" aria-label={t('backoffice.schoolGroups.edit')} onClick={() => openEdit(row)}>
              <IconifyIcon icon="mingcute:edit-2-line" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('backoffice.schoolGroups.delete')}>
            <IconButton
              size="small"
              aria-label={t('backoffice.schoolGroups.delete')}
              onClick={() => {
                setDeleteError('');
                setPendingDelete(row);
              }}
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
        <PageHeader title={t('backoffice.schoolGroups.title')} />
        <SectionCard>
          <EmptyState
            title={t('backoffice.schoolGroups.noAccess.title')}
            description={t('backoffice.schoolGroups.noAccess.description')}
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader
        title={t('backoffice.schoolGroups.title')}
        subtitle={t('backoffice.schoolGroups.subtitle')}
        actions={
          <Button variant="contained" size="small" onClick={openCreate}>
            {t('backoffice.schoolGroups.create')}
          </Button>
        }
      />

      {error && <ErrorBanner message={error} />}

      <SectionCard padding={0}>
        {!loading && groups.length === 0 && !error ? (
          <EmptyState
            title={t('backoffice.schoolGroups.empty')}
            description={t('backoffice.schoolGroups.subtitle')}
          />
        ) : (
          <Box px={3.5} py={3.5} sx={{ height: 594, width: 1 }}>
            <DataTable
              rows={groups}
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

      <Dialog open={formOpen} onClose={closeForm} fullWidth maxWidth="sm">
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            {editing ? t('backoffice.schoolGroups.editTitle') : t('backoffice.schoolGroups.createTitle')}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} mt={1}>
              {formError && <ErrorBanner message={formError} />}
              <TextField
                label={t('backoffice.schoolGroups.name')}
                value={form.name}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                required
                fullWidth
                variant="filled"
              />
              <TextField
                label={t('backoffice.schoolGroups.headquartersCnpj')}
                value={form.headquarters_cnpj}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setForm((current) => ({ ...current, headquarters_cnpj: event.target.value }))
                }
                fullWidth
                variant="filled"
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeForm} disabled={saving}>
              {t('backoffice.schoolGroups.cancel')}
            </Button>
            <Button type="submit" variant="contained" disabled={saving || !form.name.trim()}>
              {t('backoffice.schoolGroups.save')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={t('backoffice.schoolGroups.deleteConfirmTitle')}
        message={t('backoffice.schoolGroups.deleteConfirmMessage', {
          name: pendingDelete?.name ?? '',
        })}
        confirmLabel={t('backoffice.schoolGroups.delete')}
        onConfirm={handleDelete}
        onCancel={() => {
          setPendingDelete(null);
          setDeleteError('');
        }}
        destructive
      />

      {deleteError && <ErrorBanner message={deleteError} />}

      <Dialog
        open={Boolean(manageGroup)}
        onClose={() => !assignSaving && setManageGroup(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {t('backoffice.schoolGroups.manageSchoolsTitle', { name: manageGroup?.name ?? '' })}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            {membersError && <ErrorBanner message={membersError} />}
            {membersLoading ? (
              <CircularProgress size={28} />
            ) : (
              <>
                {memberSchools.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    {t('backoffice.schoolGroups.membersEmpty')}
                  </Typography>
                ) : (
                  memberSchools.map((member) => (
                    <Stack
                      key={member.id}
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Typography variant="body2">{member.name}</Typography>
                      <Button
                        size="small"
                        disabled={assignSaving}
                        onClick={() => handleUnassignSchool(member.id)}
                      >
                        {t('backoffice.schoolGroups.unassign')}
                      </Button>
                    </Stack>
                  ))
                )}
                <TextField
                  label={t('backoffice.schoolGroups.assignSchoolId')}
                  value={assignSchoolId}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setAssignSchoolId(event.target.value)
                  }
                  fullWidth
                  variant="filled"
                  type="number"
                />
                <Button
                  variant="contained"
                  size="small"
                  disabled={assignSaving || !assignSchoolId.trim()}
                  onClick={handleAssignSchool}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  {t('backoffice.schoolGroups.assign')}
                </Button>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManageGroup(null)} disabled={assignSaving}>
            {t('backoffice.schoolGroups.cancel')}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

const renderOptionalText = ({ value }: GridRenderCellParams<SchoolGroup, string | null>) =>
  value ? (
    <Typography variant="body2">{value}</Typography>
  ) : (
    <Typography variant="body2" color="text.secondary">
      —
    </Typography>
  );

export default SchoolGroups;
