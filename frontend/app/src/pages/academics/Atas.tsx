import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { DataTable, EmptyState, ErrorBanner, PageHeader, SectionCard, SemanticChip } from 'design-system';
import IncidentFormDialog from 'components/sections/academics/IncidentFormDialog';
import { useTranslation } from 'providers/I18nContext';
import { useCurrentSchool } from 'providers/useCurrentSchool';
import { ApiError } from 'services/api';
import { approveIncident, listIncidents, publishIncident } from 'services/incidentsApi';
import { fetchRoll } from 'services/preceptorshipApi';
import { membershipHasPermission } from 'utils/onboarding/access';
import { Incident, IncidentStatus, IncidentStudentOption } from 'types/incidents';

const PAGE_SIZE = 25;

const STATUS_VARIANT: Record<IncidentStatus, 'info' | 'warning' | 'success'> = {
  pending_approval: 'warning',
  approved: 'success',
  archived: 'info',
};

/**
 * "Ata" (BC7, `docs/prds/academic/incidents.md`) — the staff grid of recorded incidents, plus the
 * "nota ata" create flow, which is specifically the parent-meeting flavor (UC-IN01): a teacher
 * writes about their own classes, `manage_academic` staff write school-wide (BR-IN03).
 *
 * Approval (BR-IN08) and publish (BR-IN02) are independent member actions wired here as plain
 * buttons — the API already gates both (`IncidentPolicy#approve?`/`#publish?`); this screen only
 * hides them from roles that could never use them, as UX, not as the authorization boundary.
 */
const Atas = () => {
  const { t } = useTranslation();
  const school = useCurrentSchool();
  const schoolId = school?.school_id ?? null;
  const isTeacher = school?.role === 'teacher';
  // BR-IN08/AC-IN05: only these two role templates ever fill an approval slot — manage_academic
  // alone is not enough, even for staff who hold it.
  const canApprove =
    school?.role_template?.system_key === 'coordination' ||
    school?.role_template?.system_key === 'director';
  const canPublish = school ? membershipHasPermission(school, 'manage_academic') : false;

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [teacherRoll, setTeacherRoll] = useState<IncidentStudentOption[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actingId, setActingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState('');

  const load = useCallback(async () => {
    if (!schoolId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await listIncidents(schoolId, { page: page + 1 });
      setIncidents(response.data);
      setTotal(response.meta.total);
    } catch (err) {
      setIncidents([]);
      setTotal(0);
      setError(err instanceof ApiError ? err.message : t('atas.loadError'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, page, t]);

  useEffect(() => {
    load();
  }, [load]);

  // The teacher's own roll (BR-IN03) — the create dialog's picker for this role filters it
  // client-side rather than hitting the school-wide register, which a teacher cannot read.
  useEffect(() => {
    if (!schoolId || !isTeacher) {
      return;
    }

    let current = true;

    fetchRoll(schoolId)
      .then((response) => {
        if (current) {
          setTeacherRoll(
            response.data.map((row) => ({
              id: row.id,
              name: row.name,
              school_class_name: row.school_class_name,
            })),
          );
        }
      })
      .catch(() => {
        if (current) {
          setTeacherRoll([]);
        }
      });

    return () => {
      current = false;
    };
  }, [schoolId, isTeacher]);

  const handleCreated = () => {
    setDialogOpen(false);
    setPage(0);
    load();
  };

  const act = async (
    incident: Incident,
    action: (schoolId: number, id: number) => Promise<Incident>,
    errorKey: 'atas.approveError' | 'atas.publishError',
  ) => {
    if (!schoolId) {
      return;
    }

    setActingId(incident.id);
    setActionError('');

    try {
      await action(schoolId, incident.id);
      await load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : t(errorKey));
    } finally {
      setActingId(null);
    }
  };

  const columns = useMemo<GridColDef<Incident>[]>(
    () => [
      {
        field: 'student_name',
        headerName: t('common.student'),
        flex: 1,
        minWidth: 180,
      },
      {
        field: 'guardian_names',
        headerName: t('atas.column.guardians'),
        flex: 1,
        minWidth: 200,
        renderCell: ({ row }: GridRenderCellParams<Incident>) =>
          row.guardian_names.length > 0 ? row.guardian_names.join(', ') : t('common.none'),
      },
      {
        field: 'created_at',
        headerName: t('atas.column.date'),
        width: 130,
        renderCell: ({ row }: GridRenderCellParams<Incident>) =>
          new Date(row.created_at).toLocaleDateString(),
      },
      {
        field: 'status',
        headerName: t('common.status'),
        width: 150,
        renderCell: ({ row }: GridRenderCellParams<Incident>) => (
          <SemanticChip variant={STATUS_VARIANT[row.status]} label={t(`atas.status.${row.status}`)} />
        ),
      },
      {
        field: 'actions',
        headerName: t('common.actions'),
        width: 180,
        sortable: false,
        filterable: false,
        renderCell: ({ row }: GridRenderCellParams<Incident>) => {
          const busy = actingId === row.id;

          return (
            <Stack direction="row" spacing={1} alignItems="center" height={1}>
              {canApprove && row.status === 'pending_approval' && (
                <Button
                  size="small"
                  disabled={busy}
                  onClick={() => act(row, approveIncident, 'atas.approveError')}
                  startIcon={busy ? <CircularProgress size={14} /> : undefined}
                >
                  {t('atas.approve')}
                </Button>
              )}
              {canPublish && row.visibility === 'guardian_on_publish' && !row.published_at && (
                <Button
                  size="small"
                  disabled={busy}
                  onClick={() => act(row, publishIncident, 'atas.publishError')}
                  startIcon={busy ? <CircularProgress size={14} /> : undefined}
                >
                  {t('atas.publish')}
                </Button>
              )}
            </Stack>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, actingId, canApprove, canPublish],
  );

  if (!school) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title={t('nav.atas')} />
        <SectionCard>
          <EmptyState
            title={t('common.noAccess.title')}
            description={t('atas.noAccess.description')}
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader
        title={t('nav.atas')}
        actions={
          <Button variant="contained" size="small" onClick={() => setDialogOpen(true)}>
            {t('atas.new')}
          </Button>
        }
      />

      {error && <ErrorBanner message={error} onRetry={load} retryLabel={t('common.tryAgain')} />}
      {actionError && <ErrorBanner message={actionError} />}

      <SectionCard padding={0}>
        {!loading && incidents.length === 0 && !error ? (
          <EmptyState
            title={t('atas.empty.title')}
            description={t('atas.empty.description')}
            action={
              <Button variant="contained" size="small" onClick={() => setDialogOpen(true)}>
                {t('atas.new')}
              </Button>
            }
          />
        ) : (
          <Box px={2} py={2.5} sx={{ height: 594, width: 1 }}>
            <DataTable
              rows={incidents}
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

      <IncidentFormDialog
        open={dialogOpen}
        schoolId={school.school_id}
        teacherRoll={isTeacher ? teacherRoll : undefined}
        onClose={() => setDialogOpen(false)}
        onCreated={handleCreated}
      />
    </Stack>
  );
};

export default Atas;
