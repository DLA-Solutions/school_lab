import { useCallback, useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import ListItemButton from '@mui/material/ListItemButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useSearchParams } from 'react-router';
import { EmptyState, ErrorBanner, PageHeader, SectionCard, SemanticChip } from 'design-system';
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
      const response = await listMyStudents(schoolId);

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
    } catch (err) {
      setChildren([]);
      setError(err instanceof ApiError ? err.message : t('health.myChildren.loadError'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, t]);

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

  const openChild = (studentId: number) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('student', String(studentId));
      return next;
    });
  };

  const showAllChildren = () => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete('student');
      return next;
    });
  };

  const recordCountLabel = (count: number) => {
    if (count === 0) {
      return t('health.recordCount.none');
    }
    if (count === 1) {
      return t('health.recordCount.one');
    }
    return t('health.recordCount.other', { count });
  };

  const selectedChild =
    requestedStudentId == null
      ? undefined
      : children.find((row) => row.student.id === requestedStudentId);

  // Wait until the family list is in hand. Rendering the sheet earlier would call the health
  // API for an id that might not belong to this family.
  const showSheet = !loading && selectedChild != null && schoolId != null;
  const showUnknown =
    !loading && !error && children.length > 0 && studentQuery != null && selectedChild == null;

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

      <SectionCard>
        <Stack direction="column" gap={2}>
          <Typography variant="body2" color="text.secondary">
            {t('health.myChildren.description')}
          </Typography>

          {error && (
            <ErrorBanner message={error} onRetry={load} retryLabel={t('common.tryAgain')} />
          )}

          {loading ? (
            <Stack alignItems="center" py={6}>
              <CircularProgress size={28} />
            </Stack>
          ) : children.length === 0 ? (
            <EmptyState
              title={t('health.myChildren.empty')}
              description={t('health.myChildren.description')}
              headingLevel={2}
            />
          ) : (
            <Stack direction="column" gap={1}>
              {children.map(({ student, filled, recordCount }) => (
                <ListItemButton
                  key={student.id}
                  onClick={() => openChild(student.id)}
                  aria-label={t('health.aria', { name: student.name })}
                  sx={{ gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}
                >
                  <Typography variant="subtitle1" sx={{ minWidth: 180 }}>
                    {student.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {recordCountLabel(recordCount)}
                  </Typography>
                  <SemanticChip
                    variant={filled ? 'success' : 'warning'}
                    label={filled ? t('health.filled') : t('health.empty')}
                  />
                  <Typography variant="body2" sx={{ ml: 'auto', fontWeight: 600 }}>
                    {filled ? t('health.open') : t('health.fill')}
                  </Typography>
                </ListItemButton>
              ))}
            </Stack>
          )}
        </Stack>
      </SectionCard>
    </Stack>
  );
};

export default MyHealthRecords;
