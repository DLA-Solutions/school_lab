import { t } from '../i18n';

/** Office labels from the catalogue. A teacher row uses `teacher_name` when the API sent one. */
export const audienceLabel = (audience: string, teacherName: string | null | undefined): string => {
  switch (audience) {
    case 'coordination':
      return t('messages.audience.coordination');
    case 'secretary':
      return t('messages.audience.secretary');
    case 'director':
      return t('messages.audience.director');
    case 'teacher': {
      const name = teacherName?.trim();
      return name ? name : t('messages.audience.teacher');
    }
    default:
      return t('messages.audience.teacher');
  }
};
