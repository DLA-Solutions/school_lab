import { useCallback, useEffect, useMemo, useState } from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ChildRoutineForm from 'components/sections/academics/ChildRoutineForm';
import RoutineStory from 'components/sections/communication/RoutineStory';
import {
  EmptyState,
  ErrorBanner,
  PageHeader,
  SectionCard,
  SemanticChip,
  SuccessBanner,
} from 'design-system';
import { MessageKey } from 'locales';
import { useTranslation } from 'providers/I18nContext';
import { useCurrentSchool } from 'providers/useCurrentSchool';
import { listAllSchoolClasses } from 'services/academicsApi';
import { listThreads } from 'services/communicationApi';
import { applyMeals, listDailyRoutines } from 'services/dailyRoutinesApi';
import { listStudents } from 'services/studentsApi';
import { SchoolClass } from 'types/academics';
import { FamilyThread } from 'types/communication';
import { DailyRoutine, MealAmount, MealField } from 'types/dailyRoutine';
import { Student } from 'types/student';
import { civilToday, isBeforeCivilToday } from 'utils/civilDate';
import { communicationErrorText } from 'utils/communicationError';
import { isInfantilGrade } from 'utils/infantilGrade';
import { membershipHasPermission } from 'utils/onboarding/access';
import { schoolClassLabel } from 'utils/schoolClassLabel';

interface RollRow {
  studentId: number;
  name: string;
  routine: DailyRoutine | null;
}

const MEAL_FIELDS: { field: MealField; label: MessageKey }[] = [
  { field: 'meal_breakfast', label: 'dailyRoutine.meal.breakfast' },
  { field: 'meal_lunch', label: 'dailyRoutine.meal.lunch' },
  { field: 'meal_afternoon_snack', label: 'dailyRoutine.meal.afternoonSnack' },
  { field: 'meal_dinner', label: 'dailyRoutine.meal.dinner' },
  { field: 'meal_hydration', label: 'dailyRoutine.meal.hydration' },
];

const everyStudent = async (schoolId: number) => {
  const first = await listStudents({ schoolId, page: 1 });
  const rows = [...first.data];
  const pageSize = first.meta.per_page || first.data.length || 1;
  const pageCount = Math.ceil(first.meta.total / pageSize);

  for (let page = 2; page <= pageCount && page <= 20; page += 1) {
    const next = await listStudents({ schoolId, page });
    rows.push(...next.data);
  }

  return rows;
};

/**
 * Infantil day cards. A teacher fills the classes they teach and sends one card per child.
 * Coordination with manage_academic reads the school and does not get the composer.
 */
const DailyRoutinePage = () => {
  const { t } = useTranslation();
  const school = useCurrentSchool();
  const schoolId = school?.school_id ?? null;
  const isTeacher = school?.role === 'teacher';
  const canReadAll = school ? membershipHasPermission(school, 'manage_academic') : false;
  const canWrite = Boolean(isTeacher);

  const [date, setDate] = useState(civilToday);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classId, setClassId] = useState<number | ''>('');
  const [threads, setThreads] = useState<FamilyThread[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [routines, setRoutines] = useState<DailyRoutine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [formEpoch, setFormEpoch] = useState(0);
  const [mealField, setMealField] = useState<MealField>('meal_lunch');
  const [mealValue, setMealValue] = useState<MealAmount>('great');
  const [applying, setApplying] = useState(false);

  const locked = isBeforeCivilToday(date);

  const loadRoster = useCallback(async () => {
    if (!schoolId || (!canWrite && !canReadAll)) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (canWrite) {
        const [allClasses, children] = await Promise.all([
          listAllSchoolClasses(schoolId),
          listThreads(schoolId, 'teacher'),
        ]);
        const taught = new Set(children.map((thread) => thread.school_class_id));
        setClasses(
          allClasses.filter(
            (schoolClass) =>
              taught.has(schoolClass.id) && isInfantilGrade(schoolClass.grade_level),
          ),
        );
        setThreads(children);
        setStudents([]);
      } else {
        const [allClasses, people] = await Promise.all([
          listAllSchoolClasses(schoolId).catch(() => [] as SchoolClass[]),
          everyStudent(schoolId).catch(() => [] as Student[]),
        ]);
        setClasses(allClasses.filter((schoolClass) => isInfantilGrade(schoolClass.grade_level)));
        setStudents(people.filter((student) => isInfantilGrade(student.grade_level)));
        setThreads([]);
      }
    } catch (err) {
      setError(communicationErrorText(err, t, 'dailyRoutine.loadError'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, canWrite, canReadAll, t]);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  useEffect(() => {
    if (classId === '' && classes[0]) {
      setClassId(classes[0].id);
    }
  }, [classes, classId]);

  const loadRoutines = useCallback(async () => {
    if (!schoolId || (!canWrite && !canReadAll)) {
      return;
    }
    if (canWrite && classId === '') {
      return;
    }

    try {
      const rows = await listDailyRoutines(schoolId, {
        date,
        schoolClassId: classId === '' ? undefined : classId,
      });
      setRoutines(rows);
    } catch (err) {
      setRoutines([]);
      setError(communicationErrorText(err, t, 'dailyRoutine.loadError'));
    }
  }, [schoolId, canWrite, canReadAll, date, classId, t]);

  useEffect(() => {
    loadRoutines();
  }, [loadRoutines]);

  const roll: RollRow[] = useMemo(() => {
    if (canWrite) {
      return threads
        .filter((thread) => classId === '' || thread.school_class_id === classId)
        .map((thread) => ({
          studentId: thread.student_id,
          name: thread.student_name,
          routine: routines.find((routine) => routine.student_id === thread.student_id) ?? null,
        }));
    }

    const named = students.filter(
      (student) => classId === '' || student.school_class_id === classId,
    );
    if (named.length > 0) {
      return named.map((student) => ({
        studentId: student.id,
        name: student.name,
        routine: routines.find((routine) => routine.student_id === student.id) ?? null,
      }));
    }

    return routines.map((routine) => ({
      studentId: routine.student_id,
      name: t('dailyRoutine.studentFallback', { id: routine.student_id }),
      routine,
    }));
  }, [canWrite, threads, students, routines, classId, t]);

  const selected = roll.find((row) => row.studentId === selectedId) ?? null;

  const applyMealToClass = async () => {
    if (!schoolId || classId === '') {
      return;
    }

    setApplying(true);
    setError('');

    try {
      await applyMeals(schoolId, {
        schoolClassId: classId,
        date,
        field: mealField,
        value: mealValue,
      });
      setNotice(t('dailyRoutine.applyMeals.applied'));
      setFormEpoch((epoch) => epoch + 1);
      await loadRoutines();
    } catch (err) {
      setError(communicationErrorText(err, t, 'dailyRoutine.sendError'));
    } finally {
      setApplying(false);
    }
  };

  if (!school || (!canWrite && !canReadAll)) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title={t('nav.dailyRoutine')} />
        <SectionCard>
          <EmptyState
            title={t('common.noAccess.title')}
            description={t('dailyRoutine.noAccess.description')}
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  if (!loading && !error && canWrite && classes.length === 0) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title={t('nav.dailyRoutine')} />
        <SectionCard>
          <EmptyState
            title={t('dailyRoutine.onlyInfantil.title')}
            description={t('dailyRoutine.onlyInfantil.description')}
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  const statusOf = (routine: DailyRoutine | null) => {
    if (!routine) return { label: t('dailyRoutine.status.blank'), variant: 'info' as const };
    if (routine.status === 'sent') return { label: t('dailyRoutine.status.sent'), variant: 'success' as const };
    return { label: t('dailyRoutine.status.draft'), variant: 'warning' as const };
  };

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader
        title={t('nav.dailyRoutine')}
        subtitle={canWrite ? t('dailyRoutine.subtitle') : t('dailyRoutine.readOnlyHint')}
      />
      {error && <ErrorBanner message={error} />}
      {notice && <SuccessBanner message={notice} />}

      <SectionCard title={t('dailyRoutine.roll.title')}>
        <Stack direction="column" gap={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
            <TextField
              label={t('dailyRoutine.date')}
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            {classes.length > 0 && (
              <TextField
                select
                label={t('dailyRoutine.class')}
                value={classId}
                onChange={(event) => {
                  setClassId(Number(event.target.value));
                  setSelectedId(null);
                }}
              >
                {classes.map((schoolClass) => (
                  <MenuItem key={schoolClass.id} value={schoolClass.id}>
                    {schoolClassLabel(schoolClass, t)}
                  </MenuItem>
                ))}
              </TextField>
            )}
          </Stack>

          {locked && (
            <Typography variant="body2" color="text.secondary">
              {t('communication.errors.routineDayLocked')}
            </Typography>
          )}

          {canWrite && !locked && classId !== '' && (
            <Stack direction="column" gap={1}>
              <Typography variant="subtitle2">{t('dailyRoutine.applyMeals.title')}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t('dailyRoutine.applyMeals.description')}
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} alignItems={{ sm: 'center' }}>
                <TextField
                  select
                  label={t('dailyRoutine.applyMeals.field')}
                  value={mealField}
                  onChange={(event) => setMealField(event.target.value as MealField)}
                >
                  {MEAL_FIELDS.map(({ field, label }) => (
                    <MenuItem key={field} value={field}>
                      {t(label)}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label={t('dailyRoutine.applyMeals.value')}
                  value={mealValue}
                  onChange={(event) => setMealValue(event.target.value as MealAmount)}
                >
                  <MenuItem value="great">{t('dailyRoutine.mealValue.great')}</MenuItem>
                  <MenuItem value="regular">{t('dailyRoutine.mealValue.regular')}</MenuItem>
                  <MenuItem value="refused">{t('dailyRoutine.mealValue.refused')}</MenuItem>
                </TextField>
                <Button variant="outlined" onClick={applyMealToClass} disabled={applying}>
                  {t('dailyRoutine.applyMeals.action')}
                </Button>
              </Stack>
            </Stack>
          )}

          {loading ? (
            <Stack alignItems="center" py={4}>
              <CircularProgress />
            </Stack>
          ) : roll.length === 0 ? (
            <EmptyState
              title={t('dailyRoutine.roll.empty.title')}
              description={t('dailyRoutine.roll.empty.description')}
              headingLevel={3}
            />
          ) : (
            <Stack direction="column" gap={1}>
              {roll.map((row) => {
                const status = statusOf(row.routine);
                return (
                  <Button
                    key={row.studentId}
                    variant={row.studentId === selectedId ? 'contained' : 'text'}
                    onClick={() => setSelectedId(row.studentId)}
                    sx={{ justifyContent: 'space-between' }}
                  >
                    <span>{row.name}</span>
                    <SemanticChip variant={status.variant} label={status.label} />
                  </Button>
                );
              })}
            </Stack>
          )}
        </Stack>
      </SectionCard>

      {selected && (
        <SectionCard title={t('dailyRoutine.child.title', { name: selected.name })}>
          {canWrite ? (
            <ChildRoutineForm
              key={`${selected.studentId}-${date}-${formEpoch}`}
              schoolId={school.school_id}
              studentId={selected.studentId}
              studentName={selected.name}
              date={date}
              routine={selected.routine}
              locked={locked}
              onError={setError}
              onSaved={async (sent) => {
                setNotice(sent ? t('dailyRoutine.sent') : t('dailyRoutine.updated'));
                setFormEpoch((epoch) => epoch + 1);
                await loadRoutines();
              }}
            />
          ) : selected.routine ? (
            <RoutineStory
              routine={selected.routine}
              schoolId={school.school_id}
              audience="staff"
              studentName={selected.name}
            />
          ) : (
            <EmptyState
              title={t('dailyRoutine.status.blank')}
              description={t('dailyRoutine.readOnlyBlank')}
              headingLevel={3}
            />
          )}
        </SectionCard>
      )}
    </Stack>
  );
};

export default DailyRoutinePage;
