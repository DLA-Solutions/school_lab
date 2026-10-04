import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { DataTable, EmptyState, ErrorBanner, PageHeader, SectionCard, SemanticChip } from 'design-system';
import IconifyIcon from 'components/base/IconifyIcon';
import IncidentFormDialog from 'components/sections/academics/IncidentFormDialog';
import IncidentPreviewDialog from 'components/sections/academics/IncidentPreviewDialog';
import { useTranslation } from 'providers/I18nContext';
import { useCurrentSchool } from 'providers/useCurrentSchool';
import { ApiError } from 'services/api';
import { approveIncident, listIncidents, publishIncident } from 'services/incidentsApi';
import { listMemberships } from 'services/peopleApi';
import { fetchRoll } from 'services/preceptorshipApi';
import { membershipHasPermission } from 'utils/onboarding/access';
import { Incident, IncidentGuardianSnapshot, IncidentStatus, IncidentStudentOption } from 'types/incidents';
import { TeamMembership } from 'types/people';
import type { MessageKey } from 'locales';

const PAGE_SIZE = 25;

const STATUS_VARIANT: Record<IncidentStatus, 'info' | 'warning' | 'success'> = {
  pending_approval: 'warning',
  approved: 'success',
  archived: 'info',
};

// Mirrors `StudentGuardian::RELATIONSHIPS` — same mapping Students.tsx already uses for its own
// guardian column, reusing the same `students.relationship.*` catalogue keys rather than a new
// Ata-specific set.
const RELATIONSHIP_KEYS: Record<IncidentGuardianSnapshot['relationship'], MessageKey> = {
  father: 'students.relationship.father',
  mother: 'students.relationship.mother',
  other: 'students.relationship.other',
};

// Any membership `role` other than `teacher`/`staff` (guardian, backoffice) never files an ata —
// filtering them out of the author picker avoids offering choices that can only ever return an
// empty list.
const isAuthorRole = (role: TeamMembership['role']) => role === 'staff' || role === 'teacher';

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
  // BR-IN10 — the author filter only narrows an already-schoolwide list; a teacher's own list is
  // already their own atas only, so there is nothing for them to filter.
  const canFilterByAuthor = school ? membershipHasPermission(school, 'manage_academic') : false;

  const [searchParams, setSearchParams] = useSearchParams();
  const authorFilter = searchParams.get('reported_by_membership_id') ?? '';

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [teacherRoll, setTeacherRoll] = useState<IncidentStudentOption[]>([]);
  const [authors, setAuthors] = useState<TeamMembership[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actingId, setActingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState('');
  const [previewing, setPreviewing] = useState<Incident | null>(null);

  const setAuthorFilter = (value: string) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) {
          next.set('reported_by_membership_id', value);
        } else {
          next.delete('reported_by_membership_id');
        }
        return next;
      },
      { replace: true },
    );
    setPage(0);
  };

  const load = useCallback(async () => {
    if (!schoolId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await listIncidents(schoolId, {
        page: page + 1,
        reportedByMembershipId: authorFilter ? Number(authorFilter) : undefined,
      });
      setIncidents(response.data);
      setTotal(response.meta.total);
    } catch (err) {
      setIncidents([]);
      setTotal(0);
      setError(err instanceof ApiError ? err.message : t('atas.loadError'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, page, authorFilter, t]);

  useEffect(() => {
    load();
  }, [load]);

  // The author picker's own roster — fetched once rather than per keystroke, same reasoning as
  // the class/subject/teacher selects on AllLessonPlans. `manage_people` gates
  // `people/memberships#index`; both system templates that hold `manage_academic` by default
  // (coordination, director) also hold `manage_people` (full or partial), so this stays within
  // what the filter's own audience can already read — a custom template missing it simply sees
  // no author options besides "Minhas atas", which needs no fetch at all.
  useEffect(() => {
    if (!schoolId || !canFilterByAuthor) {
      return;
    }

    let current = true;

    listMemberships(schoolId)
      .then((response) => {
        if (current) {
          setAuthors(response.data.filter((membership) => isAuthorRole(membership.role)));
        }
      })
      .catch(() => {
        if (current) {
          setAuthors([]);
        }
      });

    return () => {
      current = false;
    };
  }, [schoolId, canFilterByAuthor]);

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
        field: 'guardians',
        headerName: t('atas.column.guardians'),
        flex: 1,
        minWidth: 200,
        renderCell: ({ row }: GridRenderCellParams<Incident>) =>
          row.guardians.length === 0 ? (
            t('common.none')
          ) : (
            <Stack direction="column" justifyContent="center" py={1}>
              {row.guardians.map((guardian, index) => (
                <Typography key={guardian.guardian_id ?? `${guardian.name}-${index}`} variant="caption">
                  {`${t(RELATIONSHIP_KEYS[guardian.relationship])}: ${guardian.name}`}
                </Typography>
              ))}
            </Stack>
          ),
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
        width: 220,
        sortable: false,
        filterable: false,
        renderCell: ({ row }: GridRenderCellParams<Incident>) => {
          const busy = actingId === row.id;

          return (
            <Stack direction="row" spacing={0.5} alignItems="center" height={1}>
              <Tooltip title={t('atas.preview')}>
                <IconButton
                  size="small"
                  aria-label={t('atas.previewAria', { student: row.student_name })}
                  onClick={() => setPreviewing(row)}
                >
                  <IconifyIcon icon="mingcute:eye-line" />
                </IconButton>
              </Tooltip>
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

      {canFilterByAuthor && (
        <Stack direction="row" gap={1.5} flexWrap="wrap" alignItems="flex-end">
          <TextField
            id="atas-filter-author"
            label={t('atas.filter.author')}
            value={authorFilter}
            onChange={(e) => setAuthorFilter(e.target.value)}
            variant="filled"
            size="small"
            select
            sx={{ width: 260 }}
          >
            <MenuItem value="">{t('atas.filter.allAuthors')}</MenuItem>
            {authors.map((author) => (
              <MenuItem key={author.id} value={String(author.id)}>
                {author.display_title ? `${author.display_title} — ${author.email}` : author.email}
              </MenuItem>
            ))}
          </TextField>
          <Chip
            label={t('atas.filter.mine')}
            clickable
            color={authorFilter === String(school.id) ? 'primary' : 'default'}
            variant={authorFilter === String(school.id) ? 'filled' : 'outlined'}
            onClick={() =>
              setAuthorFilter(authorFilter === String(school.id) ? '' : String(school.id))
            }
          />
        </Stack>
      )}

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

      <IncidentPreviewDialog
        open={previewing !== null}
        schoolId={school.school_id}
        incident={previewing}
        onClose={() => setPreviewing(null)}
      />
    </Stack>
  );
};

export default Atas;
