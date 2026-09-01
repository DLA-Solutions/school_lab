import { useCallback, useEffect, useState } from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { EmptyState, ErrorBanner, PageHeader, SectionCard, SemanticChip } from 'design-system';
import HealthProfileSection from 'components/sections/people/students/HealthProfileSection';
import HealthRecordsList from 'components/sections/people/students/HealthRecordsList';
import { useTranslation } from 'providers/I18nContext';
import { useGuardianSchool } from 'providers/useGuardianSchool';
import { ApiError } from 'services/api';
import { getHealthProfile, listHealthRecords } from 'services/healthRecordsApi';
import { listMyStudents } from 'services/studentsApi';
import { Student } from 'types/student';

/** A child and whether anything has been written about their health yet. */
interface ChildHealth {
  student: Student;
  filled: boolean;
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
 * The family's side of the health sheet: one section per child — stable profile facts plus
 * individual records the school must recognise.
 */
const MyHealthRecords = () => {
  const { t } = useTranslation();
  const membership = useGuardianSchool();
  const schoolId = membership?.school_id ?? null;

  const [children, setChildren] = useState<ChildHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
            return { student, filled: profileHasData(profile) || records.length > 0 };
          } catch {
            return { student, filled: false };
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
        current.map((row) => (row.student.id === studentId ? { ...row, filled } : row)),
      );
    } catch {
      // Status chip is secondary — a failed refresh should not block the form.
    }
  };

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
            <Stack direction="column" gap={3}>
              {children.map(({ student, filled }, index) => (
                <Stack key={student.id} direction="column" gap={2}>
                  {index > 0 && <Divider />}

                  <Stack direction="row" gap={1.5} alignItems="center" flexWrap="wrap">
                    <Typography variant="subtitle1">{student.name}</Typography>
                    <SemanticChip
                      variant={filled ? 'success' : 'warning'}
                      label={filled ? t('health.filled') : t('health.empty')}
                    />
                  </Stack>

                  <HealthProfileSection
                    schoolId={schoolId!}
                    studentId={student.id}
                    asGuardian
                    onSaved={() => refreshChildStatus(student.id)}
                  />

                  <HealthRecordsList
                    schoolId={schoolId!}
                    studentId={student.id}
                    asGuardian
                    onChanged={() => refreshChildStatus(student.id)}
                  />
                </Stack>
              ))}
            </Stack>
          )}
        </Stack>
      </SectionCard>
    </Stack>
  );
};

export default MyHealthRecords;
