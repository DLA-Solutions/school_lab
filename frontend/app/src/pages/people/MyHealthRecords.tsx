import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useSearchParams } from 'react-router';
import {
  DataTable,
  EmptyState,
  ErrorBanner,
  PageHeader,
  SectionCard,
  SemanticChip,
} from 'design-system';
import HealthProfileSection from 'components/sections/people/students/HealthProfileSection';
import HealthRecordsList from 'components/sections/people/students/HealthRecordsList';
import { useTranslation } from 'providers/I18nContext';
import { useGuardianSchool } from 'providers/useGuardianSchool';
import { ApiError } from 'services/api';
import { getHealthProfile, listHealthRecords } from 'services/healthRecordsApi';
import { listMyStudents } from 'services/studentsApi';
import { Student } from 'types/student';

/** A child, whether anything is on file, and how many records the list fetch already returned. */
interface ChildHealth {
  student: Student;
  filled: boolean;
  recordCount: number;
}

/** One row of the family list. `id` is the student id the grid and `?student=` both use. */
interface HealthListRow {
  id: number;
  name: string;
  filled: boolean;
  recordCount: number;
}

const PAGE_SIZE = 25;

const profileHasData = (profile: Awaited<ReturnType<typeof getHealthProfile>>) =>
  Boolean(
    profile.blood_type ||
      profile.health_plan_name ||
      profile.health_plan_number ||
      profile.emergency_contact_name ||
      profile.emergency_contact_phone ||
      profile.special_care_notes,
  );

/**
 * The family's health sheet, one child at a time.
 *
 * The list is the first screen even when there is a single child, so the family sees whose
 * sheet they are about to open. The chosen child lives in `?student=`. This component stays
 * mounted across that change, so going back does not reload the list. An id that is not among
 * the loaded children never reaches the health API.
 */
const MyHealthRecords = () => {
  const { t } = useTranslation();
  const membership = useGuardianSchool();
  const schoolId = membership?.school_id ?? null;
  const [searchParams, setSearchParams] = useSearchParams();

  const [children, setChildren] = useState<ChildHealth[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const studentQuery = searchParams.get('student');
  const requestedStudentId =
    studentQuery != null && /^\d+$/.test(studentQuery) ? Number(studentQuery) : null;

  const load = useCallback(async () => {
    if (!schoolId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await listMyStudents(schoolId, page + 1);

      const rows = await Promise.all(
        response.data.map(async (student) => {
          try {
            const [profile, records] = await Promise.all([
              getHealthProfile(schoolId, student.id, { asGuardian: true }),
              listHealthRecords(schoolId, student.id, { asGuardian: true }),
            ]);
            return {
              student,
              filled: profileHasData(profile) || records.length > 0,
              recordCount: records.length,
            };
          } catch {
            return { student, filled: false, recordCount: 0 };
          }
        }),
      );

      setChildren(rows);
      setTotal(response.meta.total);
    } catch (err) {
      setChildren([]);
      setTotal(0);
      setError(err instanceof ApiError ? err.message : t('health.myChildren.loadError'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, page, t]);

  useEffect(() => {
    load();
  }, [load]);

  const refreshChildStatus = async (studentId: number) => {
    if (!schoolId) {
      return;
    }

    try {
      const [profile, records] = await Promise.all([
        getHealthProfile(schoolId, studentId, { asGuardian: true }),
        listHealthRecords(schoolId, studentId, { asGuardian: true }),
      ]);
      const filled = profileHasData(profile) || records.length > 0;
      setChildren((current) =>
        current.map((row) =>
          row.student.id === studentId ? { ...row, filled, recordCount: records.length } : row,
        ),
      );
    } catch {
      // Status chip is secondary — a failed refresh should not block the form.
    }
  };

  const openChild = useCallback(
    (studentId: number) => {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.set('student', String(studentId));
        return next;
      });
    },
    [setSearchParams],
  );

  const showAllChildren = () => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete('student');
      return next;
    });
  };

  const recordCountLabel = useCallback(
    (count: number) => {
      if (count === 0) {
        return t('health.recordCount.none');
      }
      if (count === 1) {
        return t('health.recordCount.one');
      }
      return t('health.recordCount.other', { count });
    },
    [t],
  );

  const rows = useMemo<HealthListRow[]>(
    () =>
      children.map(({ student, filled, recordCount }) => ({
        id: student.id,
        name: student.name,
        filled,
        recordCount,
      })),
    [children],
  );

  const columns = useMemo<GridColDef<HealthListRow>[]>(
    () => [
      {
        field: 'name',
        headerName: t('common.student'),
        flex: 1,
        minWidth: 180,
        sortable: false,
        renderCell: ({ row }: GridRenderCellParams<HealthListRow>) => (
          <Typography variant="body2">{row.name}</Typography>
        ),
      },
      {
        field: 'recordCount',
        headerName: t('health.records.title'),
        flex: 1,
        minWidth: 160,
        sortable: false,
        renderCell: ({ row }: GridRenderCellParams<HealthListRow>) => (
          <Typography variant="body2" color="text.secondary">
            {recordCountLabel(row.recordCount)}
          </Typography>
        ),
      },
      {
        field: 'filled',
        headerName: t('common.status'),
        width: 170,
        sortable: false,
        renderCell: ({ row }: GridRenderCellParams<HealthListRow>) => (
          <SemanticChip
            variant={row.filled ? 'success' : 'warning'}
            label={row.filled ? t('health.filled') : t('health.empty')}
          />
        ),
      },
      {
        field: 'actions',
        headerName: t('common.actions'),
        width: 150,
        sortable: false,
        filterable: false,
        renderCell: ({ row }: GridRenderCellParams<HealthListRow>) => (
          <Button
            size="small"
            onClick={(event) => {
              event.stopPropagation();
              openChild(row.id);
            }}
          >
            {row.filled ? t('health.open') : t('health.fill')}
          </Button>
        ),
      },
    ],
    [openChild, recordCountLabel, t],
  );

  const selectedChild =
    requestedStudentId == null
      ? undefined
      : children.find((row) => row.student.id === requestedStudentId);

  // Wait until the family list is in hand. Rendering the sheet earlier would call the health
  // API for an id that might not belong to this family.
  const showSheet = !loading && selectedChild != null && schoolId != null;
  const showUnknown =
    !loading && !error && children.length > 0 && studentQuery != null && selectedChild == null;
  const showEmpty = !loading && !error && children.length === 0;

  const allChildrenButton = (
    <Button variant="outlined" size="small" onClick={showAllChildren}>
      {t('health.allChildren')}
    </Button>
  );

  if (showSheet && selectedChild && schoolId != null) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader
          title={selectedChild.student.name}
          subtitle={t('health.title')}
          actions={allChildrenButton}
        />

        <SectionCard>
          <Stack direction="column" gap={2}>
            <Typography variant="body2" color="text.secondary">
              {t('health.description')}
            </Typography>

            <HealthProfileSection
              schoolId={schoolId}
              studentId={selectedChild.student.id}
              asGuardian
              onSaved={() => refreshChildStatus(selectedChild.student.id)}
            />

            <HealthRecordsList
              schoolId={schoolId}
              studentId={selectedChild.student.id}
              asGuardian
              onChanged={() => refreshChildStatus(selectedChild.student.id)}
            />
          </Stack>
        </SectionCard>
      </Stack>
    );
  }

  if (showUnknown) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title={t('health.myChildren.title')} actions={allChildrenButton} />

        <SectionCard>
          <EmptyState title={t('health.myChildren.unknown')} headingLevel={2} />
        </SectionCard>
      </Stack>
    );
  }

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader title={t('health.myChildren.title')} />

      {!showEmpty && (
        <Typography variant="body2" color="text.secondary">
          {t('health.myChildren.description')}
        </Typography>
      )}

      {error && <ErrorBanner message={error} onRetry={load} retryLabel={t('common.tryAgain')} />}

      <SectionCard padding={0}>
        {showEmpty ? (
          <EmptyState
            title={t('health.myChildren.empty')}
            description={t('health.myChildren.description')}
            headingLevel={2}
          />
        ) : (
          <Box px={3.5} py={3.5} sx={{ height: 594, width: 1 }}>
            <DataTable
              rows={rows}
              columns={columns}
              loading={loading}
              disableRowSelectionOnClick
              getRowHeight={() => 'auto'}
              paginationMode="server"
              rowCount={total}
              pageSizeOptions={[PAGE_SIZE]}
              paginationModel={{ page, pageSize: PAGE_SIZE }}
              onPaginationModelChange={(model) => setPage(model.page)}
              onRowClick={({ row }) => openChild(row.id)}
              rangeLabel={({ from, to, count }) => t('common.range', { from, to, count })}
              sx={{ '& .MuiDataGrid-row': { cursor: 'pointer' } }}
            />
          </Box>
        )}
      </SectionCard>
    </Stack>
  );
};

export default MyHealthRecords;
