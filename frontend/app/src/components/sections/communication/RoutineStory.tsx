import { ReactNode } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'providers/I18nContext';
import { MessageKey } from 'locales';
import { DailyRoutine, MealAmount, YesNo } from 'types/dailyRoutine';
import { AttachmentReader } from 'services/communicationApi';
import AttachmentMedia from './AttachmentMedia';

interface RoutineStoryProps {
  routine: DailyRoutine;
  schoolId: number;
  audience: AttachmentReader;
  /** When the family is reading, the child's name sits above the day. */
  studentName?: string;
}

const SLEEP_FIELDS = [
  ['sleep_morning', 'dailyRoutine.sleep.morning'],
  ['sleep_after_lunch', 'dailyRoutine.sleep.afterLunch'],
  ['sleep_afternoon', 'dailyRoutine.sleep.afternoon'],
] as const;

const MEAL_FIELDS = [
  ['meal_breakfast', 'dailyRoutine.meal.breakfast'],
  ['meal_lunch', 'dailyRoutine.meal.lunch'],
  ['meal_afternoon_snack', 'dailyRoutine.meal.afternoonSnack'],
  ['meal_dinner', 'dailyRoutine.meal.dinner'],
  ['meal_hydration', 'dailyRoutine.meal.hydration'],
] as const;

const SIGNAL_FIELDS = [
  ['interaction', 'dailyRoutine.signal.interaction'],
  ['evacuation', 'dailyRoutine.signal.evacuation'],
  ['discomfort', 'dailyRoutine.signal.discomfort'],
] as const;

const marked = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.length > 0;

/**
 * The day as a story: what was written and recorded, then only the marks that were set.
 * A blank sleep or meal is absent, not a "no".
 */
const RoutineStory = ({ routine, schoolId, audience, studentName }: RoutineStoryProps) => {
  const { t } = useTranslation();

  const yesNoLabel = (value: YesNo) => (value === 'yes' ? t('dailyRoutine.yes') : t('dailyRoutine.no'));
  const mealLabel = (value: MealAmount) => t(`dailyRoutine.mealValue.${value}` as MessageKey);

  const sleep = SLEEP_FIELDS.filter(([key]) => marked(routine[key]));
  const meals = MEAL_FIELDS.filter(([key]) => marked(routine[key]));
  const signals = SIGNAL_FIELDS.filter(([key]) => marked(routine[key]));
  const attachments = routine.attachment_ids ?? [];
  const narrative = marked(routine.narrative) ? routine.narrative : null;

  return (
    <Stack direction="column" gap={1.5}>
      {studentName && <Typography variant="subtitle2">{studentName}</Typography>}

      {narrative && (
        <Stack direction="column" gap={0.5}>
          <Typography variant="overline" color="text.secondary">
            {t('dailyRoutine.narrative.title')}
          </Typography>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
            {narrative}
          </Typography>
        </Stack>
      )}

      {attachments.map((id) => (
        <AttachmentMedia key={id} schoolId={schoolId} attachmentId={id} audience={audience} />
      ))}

      {sleep.length > 0 && (
        <MarkGroup title={t('dailyRoutine.sleep.title')}>
          {sleep.map(([key, label]) => (
            <Mark key={key} label={t(label)} value={yesNoLabel(routine[key] as YesNo)} />
          ))}
        </MarkGroup>
      )}

      {meals.length > 0 && (
        <MarkGroup title={t('dailyRoutine.meals.title')}>
          {meals.map(([key, label]) => (
            <Mark key={key} label={t(label)} value={mealLabel(routine[key] as MealAmount)} />
          ))}
        </MarkGroup>
      )}

      {signals.length > 0 && (
        <MarkGroup title={t('dailyRoutine.signals.title')}>
          {signals.map(([key, label]) => (
            <Mark key={key} label={t(label)} value={yesNoLabel(routine[key] as YesNo)} />
          ))}
          {marked(routine.discomfort_detail) && (
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {routine.discomfort_detail}
            </Typography>
          )}
        </MarkGroup>
      )}
    </Stack>
  );
};

const MarkGroup = ({ title, children }: { title: string; children: ReactNode }) => (
  <Stack direction="column" gap={0.5}>
    <Typography variant="overline" color="text.secondary">
      {title}
    </Typography>
    {children}
  </Stack>
);

const Mark = ({ label, value }: { label: string; value: string }) => (
  <Typography variant="body2">
    {label}: {value}
  </Typography>
);

export default RoutineStory;
