import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { EmptyState, PageHeader, SectionCard } from 'design-system';
import TeacherHealthProfileSection from 'components/sections/academics/TeacherHealthProfileSection';
import { useTranslation } from 'providers/I18nContext';
import { useCurrentSchool } from 'providers/useCurrentSchool';

/**
 * A teacher's own side of the collaborator health profile (BC6, UC-CH01) — one profile, no
 * sub-records, resolved server-side by login-email match against their own `Teacher` row.
 */
const MyHealthProfile = () => {
  const { t } = useTranslation();
  const school = useCurrentSchool();
  const schoolId = school?.school_id ?? null;

  if (!schoolId) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title={t('health.teacherProfile.title')} />
        <SectionCard>
          <EmptyState
            title={t('common.noAccess.title')}
            description={t('health.teacherProfile.description')}
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader title={t('health.teacherProfile.title')} />

      <SectionCard>
        <Stack direction="column" gap={2.5}>
          <Typography variant="body2" color="text.secondary">
            {t('health.teacherProfile.description')}
          </Typography>

          <TeacherHealthProfileSection schoolId={schoolId} />
        </Stack>
      </SectionCard>
    </Stack>
  );
};

export default MyHealthProfile;
