import { useState } from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconifyIcon from 'components/base/IconifyIcon';
import AttachmentMedia from 'components/sections/communication/AttachmentMedia';
import MediaPicker from 'components/sections/communication/MediaPicker';
import { PendingMedia } from 'components/sections/communication/mediaLimits';
import { MessageKey } from 'locales';
import { useTranslation } from 'providers/I18nContext';
import { uploadAttachment } from 'services/communicationApi';
import { sendDailyRoutine, upsertDailyRoutine } from 'services/dailyRoutinesApi';
import { DailyRoutine, DailyRoutineInput, MealAmount, YesNo } from 'types/dailyRoutine';
import { communicationErrorText } from 'utils/communicationError';

interface ChildRoutineFormProps {
  schoolId: number;
  studentId: number;
  studentName: string;
  date: string;
  routine: DailyRoutine | null;
  locked: boolean;
  onSaved: (sent: boolean) => void;
  onError: (message: string) => void;
}

const blank = (value: string | null | undefined) => value ?? '';

const yesNoOrNull = (value: string): YesNo | null => (value === 'yes' || value === 'no' ? value : null);
const mealOrNull = (value: string): MealAmount | null =>
  value === 'great' || value === 'regular' || value === 'refused' ? value : null;

const REJECTION_KEYS: Record<string, MessageKey> = {
  file_too_large: 'communication.errors.fileTooLarge',
  too_many_files: 'communication.errors.tooManyFiles',
  unsupported_media_type: 'communication.errors.unsupportedMediaType',
  recording_unavailable: 'communication.errors.recordingUnavailable',
};

/**
 * The child's day, led by the narrative. Sleep, meals, and signals stay collapsed.
 * One action sends the card; a day already sent is updated in place and not sent again.
 */
const ChildRoutineForm = ({
  schoolId,
  studentId,
  studentName,
  date,
  routine,
  locked,
  onSaved,
  onError,
}: ChildRoutineFormProps) => {
  const { t } = useTranslation();
  const alreadySent = routine?.status === 'sent';
  const [narrative, setNarrative] = useState(blank(routine?.narrative));
  const [sleepMorning, setSleepMorning] = useState(blank(routine?.sleep_morning));
  const [sleepAfterLunch, setSleepAfterLunch] = useState(blank(routine?.sleep_after_lunch));
  const [sleepAfternoon, setSleepAfternoon] = useState(blank(routine?.sleep_afternoon));
  const [interaction, setInteraction] = useState(blank(routine?.interaction));
  const [evacuation, setEvacuation] = useState(blank(routine?.evacuation));
  const [discomfort, setDiscomfort] = useState(blank(routine?.discomfort));
  const [discomfortDetail, setDiscomfortDetail] = useState(blank(routine?.discomfort_detail));
  const [breakfast, setBreakfast] = useState(blank(routine?.meal_breakfast));
  const [lunch, setLunch] = useState(blank(routine?.meal_lunch));
  const [afternoonSnack, setAfternoonSnack] = useState(blank(routine?.meal_afternoon_snack));
  const [dinner, setDinner] = useState(blank(routine?.meal_dinner));
  const [hydration, setHydration] = useState(blank(routine?.meal_hydration));
  const [keptAttachmentIds, setKeptAttachmentIds] = useState<number[]>(routine?.attachment_ids ?? []);
  const [files, setFiles] = useState<PendingMedia[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const payload = (attachmentIds: number[]): DailyRoutineInput => ({
    student_id: studentId,
    date,
    narrative: narrative.trim() || null,
    sleep_morning: yesNoOrNull(sleepMorning),
    sleep_after_lunch: yesNoOrNull(sleepAfterLunch),
    sleep_afternoon: yesNoOrNull(sleepAfternoon),
    interaction: yesNoOrNull(interaction),
    evacuation: yesNoOrNull(evacuation),
    discomfort: yesNoOrNull(discomfort),
    discomfort_detail: discomfort === 'yes' ? discomfortDetail.trim() || null : null,
    meal_breakfast: mealOrNull(breakfast),
    meal_lunch: mealOrNull(lunch),
    meal_afternoon_snack: mealOrNull(afternoonSnack),
    meal_dinner: mealOrNull(dinner),
    meal_hydration: mealOrNull(hydration),
    attachment_ids: attachmentIds,
  });

  const hasContent = (input: DailyRoutineInput) =>
    Boolean(input.narrative) ||
    Boolean(input.discomfort_detail) ||
    input.attachment_ids.length > 0 ||
    [
      input.sleep_morning,
      input.sleep_after_lunch,
      input.sleep_afternoon,
      input.interaction,
      input.evacuation,
      input.discomfort,
      input.meal_breakfast,
      input.meal_lunch,
      input.meal_afternoon_snack,
      input.meal_dinner,
      input.meal_hydration,
    ].some(Boolean);

  const submit = async () => {
    setError('');
    if (!hasContent(payload(keptAttachmentIds)) && files.length === 0) {
      setError(t('communication.errors.emptyContent'));
      return;
    }

    if (discomfort === 'yes' && !discomfortDetail.trim()) {
      setError(t('communication.errors.discomfortDetailRequired'));
      return;
    }

    setSending(true);

    try {
      const uploaded: number[] = [];
      for (const item of files) {
        const attachment = await uploadAttachment(schoolId, 'teacher', item.file);
        uploaded.push(attachment.id);
      }

      const saved = await upsertDailyRoutine(schoolId, payload([...keptAttachmentIds, ...uploaded]));

      if (saved.status !== 'sent') {
        await sendDailyRoutine(schoolId, saved.id);
        onSaved(true);
      } else {
        onSaved(false);
      }
    } catch (err) {
      const message = communicationErrorText(err, t, 'dailyRoutine.sendError');
      setError(message);
      onError(message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Stack direction="column" gap={2}>
      <Typography variant="subtitle1">{studentName}</Typography>

      <Stack direction="column" gap={0.5}>
        <Typography variant="h6">{t('dailyRoutine.narrative.title')}</Typography>
        <TextField
          label={t('dailyRoutine.narrative.label')}
          placeholder={t('dailyRoutine.narrative.placeholder')}
          value={narrative}
          onChange={(event) => setNarrative(event.target.value)}
          multiline
          minRows={3}
          disabled={locked || sending}
        />
      </Stack>

      <MediaPicker
        files={files}
        reserved={keptAttachmentIds.length}
        disabled={locked || sending}
        onChange={setFiles}
        onReject={(reason) => setError(t(REJECTION_KEYS[reason]))}
      />

      {keptAttachmentIds.map((id) => (
        <Stack key={id} direction="row" gap={1} alignItems="center">
          <AttachmentMedia schoolId={schoolId} attachmentId={id} audience="staff" />
          <Button
            size="small"
            disabled={locked || sending}
            onClick={() => setKeptAttachmentIds((current) => current.filter((item) => item !== id))}
          >
            {t('communication.removeFile')}
          </Button>
        </Stack>
      ))}

      <Accordion disableGutters elevation={0}>
        <AccordionSummary expandIcon={<IconifyIcon icon="mingcute:down-line" />}>
          {t('dailyRoutine.sleep.title')}
        </AccordionSummary>
        <AccordionDetails>
          <Stack direction="column" gap={1.5}>
            <YesNoField label={t('dailyRoutine.sleep.morning')} value={sleepMorning} onChange={setSleepMorning} disabled={locked || sending} />
            <YesNoField label={t('dailyRoutine.sleep.afterLunch')} value={sleepAfterLunch} onChange={setSleepAfterLunch} disabled={locked || sending} />
            <YesNoField label={t('dailyRoutine.sleep.afternoon')} value={sleepAfternoon} onChange={setSleepAfternoon} disabled={locked || sending} />
          </Stack>
        </AccordionDetails>
      </Accordion>

      <Accordion disableGutters elevation={0}>
        <AccordionSummary expandIcon={<IconifyIcon icon="mingcute:down-line" />}>
          {t('dailyRoutine.meals.title')}
        </AccordionSummary>
        <AccordionDetails>
          <Stack direction="column" gap={1.5}>
            <MealFieldControl label={t('dailyRoutine.meal.breakfast')} value={breakfast} onChange={setBreakfast} disabled={locked || sending} />
            <MealFieldControl label={t('dailyRoutine.meal.lunch')} value={lunch} onChange={setLunch} disabled={locked || sending} />
            <MealFieldControl label={t('dailyRoutine.meal.afternoonSnack')} value={afternoonSnack} onChange={setAfternoonSnack} disabled={locked || sending} />
            <MealFieldControl label={t('dailyRoutine.meal.dinner')} value={dinner} onChange={setDinner} disabled={locked || sending} />
            <MealFieldControl label={t('dailyRoutine.meal.hydration')} value={hydration} onChange={setHydration} disabled={locked || sending} />
          </Stack>
        </AccordionDetails>
      </Accordion>

      <Accordion disableGutters elevation={0}>
        <AccordionSummary expandIcon={<IconifyIcon icon="mingcute:down-line" />}>
          {t('dailyRoutine.signals.title')}
        </AccordionSummary>
        <AccordionDetails>
          <Stack direction="column" gap={1.5}>
            <YesNoField label={t('dailyRoutine.signal.interaction')} value={interaction} onChange={setInteraction} disabled={locked || sending} />
            <YesNoField label={t('dailyRoutine.signal.evacuation')} value={evacuation} onChange={setEvacuation} disabled={locked || sending} />
            <YesNoField
              label={t('dailyRoutine.signal.discomfort')}
              value={discomfort}
              disabled={locked || sending}
              onChange={(value) => {
                setDiscomfort(value);
                if (value !== 'yes') {
                  setDiscomfortDetail('');
                }
              }}
            />
            {discomfort === 'yes' && (
              <TextField
                label={t('dailyRoutine.discomfortDetail')}
                value={discomfortDetail}
                onChange={(event) => setDiscomfortDetail(event.target.value)}
                multiline
                minRows={2}
                required
                disabled={locked || sending}
              />
            )}
          </Stack>
        </AccordionDetails>
      </Accordion>

      {error && (
        <Typography variant="body2" color="error" role="alert">
          {error}
        </Typography>
      )}

      <Stack direction="row">
        <Button variant="contained" onClick={submit} disabled={locked || sending}>
          {sending
            ? t('dailyRoutine.sending')
            : alreadySent
              ? t('dailyRoutine.update')
              : t('dailyRoutine.send')}
        </Button>
      </Stack>
    </Stack>
  );
};

const YesNoField = ({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) => {
  const { t } = useTranslation();

  return (
    <TextField select label={label} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
      <MenuItem value="">{t('dailyRoutine.unset')}</MenuItem>
      <MenuItem value="yes">{t('dailyRoutine.yes')}</MenuItem>
      <MenuItem value="no">{t('dailyRoutine.no')}</MenuItem>
    </TextField>
  );
};

const MealFieldControl = ({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) => {
  const { t } = useTranslation();

  return (
    <TextField select label={label} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
      <MenuItem value="">{t('dailyRoutine.unset')}</MenuItem>
      <MenuItem value="great">{t('dailyRoutine.mealValue.great')}</MenuItem>
      <MenuItem value="regular">{t('dailyRoutine.mealValue.regular')}</MenuItem>
      <MenuItem value="refused">{t('dailyRoutine.mealValue.refused')}</MenuItem>
    </TextField>
  );
};

export default ChildRoutineForm;
