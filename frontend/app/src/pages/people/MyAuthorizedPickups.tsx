import { useCallback, useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { EmptyState, ErrorBanner, PageHeader, SectionCard, SemanticChip } from 'design-system';
import AuthorizedPickupsDialog from 'components/sections/people/students/AuthorizedPickupsDialog';
import { useTranslation } from 'providers/I18nContext';
import { useGuardianSchool } from 'providers/useGuardianSchool';
import { ApiError } from 'services/api';
import { listAuthorizedPickups } from 'services/authorizedPickupsApi';
import { listMyStudents } from 'services/studentsApi';
import { Student } from 'types/student';

/** A child and how many people the family has authorised to collect them. */
interface ChildPickups {
  student: Student;
  count: number;
}

/**
 * The family's side: one row per child, each opening the list of people allowed to collect them.
 *
 * Sits in the portal alongside the boletos and the health sheet — the handful of things the school
 * needs from a family, in the one place they already come to.
 */
const MyAuthorizedPickups = () => {
  const { t } = useTranslation();
  const membership = useGuardianSchool();
  const schoolId = membership?.school_id ?? null;

  const [children, setChildren] = useState<ChildPickups[]>([]);
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

      // How many are authorised is read per child: the family's first question here is which
      // children still have nobody on the list.
      const rows = await Promise.all(
        response.data.map(async (student) => {
          try {
            const pickups = await listAuthorizedPickups(schoolId, student.id, {
              asGuardian: true,
            });
            return { student, count: pickups.length };
          } catch {
            // One unreadable list should not hide the other children.
            return { student, count: 0 };
          }
        }),
      );

      setChildren(rows);
    } catch (err) {
      setChildren([]);
      setError(err instanceof ApiError ? err.message : t('pickups.myChildren.loadError'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, t]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader title={t('pickups.myChildren.title')} />

      <SectionCard>
        <Stack direction="column" gap={2}>
          <Typography variant="body2" color="text.secondary">
            {t('pickups.myChildren.description')}
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
              title={t('pickups.myChildren.empty')}
              description={t('pickups.myChildren.description')}
              headingLevel={2}
            />
          ) : (
            <Stack direction="column" gap={1.5}>
              {children.map(({ student, count }) => (
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
                    variant={count > 0 ? 'success' : 'warning'}
                    label={
                      count > 0
                        ? t('pickups.count', { count: String(count) })
                        : t('pickups.empty.title')
                    }
                  />
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => setOpenFor(student)}
                    aria-label={t('pickups.aria', { name: student.name })}
                  >
                    {t('pickups.manage')}
                  </Button>
                </Stack>
              ))}
            </Stack>
          )}
        </Stack>
      </SectionCard>

      {openFor && schoolId && (
        <AuthorizedPickupsDialog
          open
          asGuardian
          schoolId={schoolId}
          studentId={openFor.id}
          studentName={openFor.name}
          onClose={() => {
            setOpenFor(null);
            // The counts behind the dialog should reflect whatever was just authorised.
            load();
          }}
        />
      )}
    </Stack>
  );
};

export default MyAuthorizedPickups;
