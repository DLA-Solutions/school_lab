import { useCallback, useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { EmptyState, ErrorBanner, PageHeader, SectionCard, SemanticChip } from 'design-system';
import HealthRecordDialog from 'components/sections/people/students/HealthRecordDialog';
import { useTranslation } from 'providers/I18nContext';
import { useGuardianSchool } from 'providers/useGuardianSchool';
import { ApiError } from 'services/api';
import { getHealthRecord } from 'services/healthRecordsApi';
import { listMyStudents } from 'services/studentsApi';
import { Student } from 'types/student';

/** A child and whether their sheet has anything on it yet. */
interface ChildSheet {
  student: Student;
  filled: boolean;
}

/**
 * The family's side of the health sheet: one row per child, each opening the sheet for that child.
 *
 * Sits alongside the boletos in the portal because it is the same errand — the handful of things
 * the school needs from a family, in the one place they already come to.
 */
const MyHealthRecords = () => {
  const { t } = useTranslation();
  const membership = useGuardianSchool();
  const schoolId = membership?.school_id ?? null;

  const [children, setChildren] = useState<ChildSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openFor, setOpenFor] = useState<Student | null>(null);

  const load = useCallback(async () => {
    if (!schoolId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await listMyStudents(schoolId);

      // Whether each sheet has been filled in is read per child: the listing endpoint answers
      // about students, and the family's first question here is which ones are still blank.
      const sheets = await Promise.all(
        response.data.map(async (student) => {
          try {
            const record = await getHealthRecord(schoolId, student.id, { asGuardian: true });
            return { student, filled: record.filled };
          } catch {
            // One unreadable sheet should not hide the other children.
            return { student, filled: false };
          }
        }),
      );

      setChildren(sheets);
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
            <Stack direction="column" gap={1.5}>
              {children.map(({ student, filled }) => (
                <Stack
                  key={student.id}
                  direction="row"
                  gap={1.5}
                  alignItems="center"
                  flexWrap="wrap"
                >
                  <Typography variant="body2" sx={{ minWidth: 180 }}>
                    {student.name}
                  </Typography>
                  <SemanticChip
                    variant={filled ? 'success' : 'warning'}
                    label={filled ? t('health.filled') : t('health.empty')}
                  />
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => setOpenFor(student)}
                    aria-label={t('health.aria', { name: student.name })}
                  >
                    {t('health.fill')}
                  </Button>
                </Stack>
              ))}
            </Stack>
          )}
        </Stack>
      </SectionCard>

      {openFor && schoolId && (
        <HealthRecordDialog
          open
          asGuardian
          schoolId={schoolId}
          studentId={openFor.id}
          studentName={openFor.name}
          onClose={() => {
            setOpenFor(null);
            // A sheet just filled in should stop reading as blank behind the dialog.
            load();
          }}
        />
      )}
    </Stack>
  );
};

export default MyHealthRecords;
