import Stack from '@mui/material/Stack';
import InstructionalDaysAdminCalendar from 'components/sections/academics/InstructionalDaysAdminCalendar';
import LessonPlanCalendar from 'components/sections/academics/LessonPlanCalendar';
import { EmptyState, PageHeader, SectionCard } from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { useCurrentSchool } from 'providers/useCurrentSchool';
import { membershipHasPermission } from 'utils/onboarding/access';

/**
 * One menu entry, two faces (BC10 `docs/prds/academic/lesson-plans.md`; BR-SY10 in
 * `docs/prds/platform-and-admin/school-year.md`):
 *
 * - A teacher plans a class's instructional days (UC-LP01/UC-LP02) on a yearly calendar.
 * - Everyone else sees the admin's day-by-day instructional-days marking screen (UC-SY05) that
 *   feeds that calendar — writable only with `manage_school_settings`, readable by any staff.
 *
 * Mirrors the role split already used in `Grades.tsx` (`school?.role === 'teacher'`) rather than
 * a finer permission key — neither PRD defines one for "is a teacher" on the client.
 */
const LessonPlans = () => {
  const { t } = useTranslation();
  const school = useCurrentSchool();

  if (!school) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title={t('nav.lessonPlans')} />
        <SectionCard>
          <EmptyState
            title={t('common.noAccess.title')}
            description={t('classes.noAccess.description')}
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  const isTeacher = school.role === 'teacher';
  const canManage = membershipHasPermission(school, 'manage_school_settings');

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader title={t('nav.lessonPlans')} />
      {isTeacher ? (
        <LessonPlanCalendar schoolId={school.school_id} />
      ) : (
        <InstructionalDaysAdminCalendar schoolId={school.school_id} canManage={canManage} />
      )}
    </Stack>
  );
};

export default LessonPlans;
