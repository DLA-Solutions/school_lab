import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import IconifyIcon from 'components/base/IconifyIcon';
import LessonPlanPreviewDialog from 'components/sections/academics/LessonPlanPreviewDialog';
import { DataTable, EmptyState, ErrorBanner, PageHeader, SectionCard } from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { useCurrentSchool } from 'providers/useCurrentSchool';
import { ApiError } from 'services/api';
import { listSchoolClasses, listSubjects, listTeachers } from 'services/academicsApi';
import { listLessonPlans } from 'services/lessonPlansApi';
import { SchoolClass, Subject, Teacher } from 'types/academics';
import { LessonPlan } from 'types/lessonPlans';
import { membershipHasPermission } from 'utils/onboarding/access';
import { schoolClassLabel } from 'utils/schoolClassLabel';

const PAGE_SIZE = 25;

/**
 * UC-LP04/AC-LP07 (BC10, `docs/prds/academic/lesson-plans.md`) — coordination's own screen over
 * every teacher's lesson plans in the school, filterable by teacher, subject and class.
 *
 * A distinct menu entry from `LessonPlans.tsx` (`nav.lessonPlans`), which stays exactly what it
 * was: the teacher's own calendar, or the instructional-days admin calendar for everyone else.
 * This screen is read-only and gated on `manage_academic` — the `teacher_id` filter only narrows
 * for that actor server-side (`LessonPlanPolicy#manage_academic_staff?`), so there is nothing
 * teacher-specific to branch on here.
 */
const AllLessonPlans = () => {
  const { t, locale } = useTranslation();
  const school = useCurrentSchool();
  const schoolId = school?.school_id ?? null;
  const canView = school !== null && membershipHasPermission(school, 'manage_academic');

  const [searchParams, setSearchParams] = useSearchParams();
  const teacherFilter = searchParams.get('teacher_id') ?? '';
  const subjectFilter = searchParams.get('subject_id') ?? '';
  const classFilter = searchParams.get('school_class_id') ?? '';

  const [plans, setPlans] = useState<LessonPlan[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);

  const [previewing, setPreviewing] = useState<LessonPlan | null>(null);

  const setFilter = (key: string, value: string) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) {
          next.set(key, value);
        } else {
          next.delete(key);
        }
        return next;
      },
      { replace: true },
    );
    setPage(0);
  };

  // The three selects are filters, not a form, so they are loaded once rather than per keystroke
  // — same reasoning as the class/subject pickers on Aulas and Notas.
  useEffect(() => {
    if (!schoolId || !canView) {
      return;
    }

    let current = true;

    Promise.all([listTeachers({ schoolId }), listSubjects(schoolId), listSchoolClasses(schoolId)])
      .then(([teachersResponse, subjectsResponse, classesResponse]) => {
        if (!current) {
          return;
        }

        setTeachers(teachersResponse.data);
        setSubjects(subjectsResponse.data);
        setClasses(classesResponse.data);
      })
      .catch(() => {
        if (current) {
          setTeachers([]);
          setSubjects([]);
          setClasses([]);
        }
      });

    return () => {
      current = false;
    };
  }, [schoolId, canView]);

  const load = useCallback(async () => {
    if (!schoolId || !canView) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await listLessonPlans(schoolId, {
        page: page + 1,
        teacher_id: teacherFilter ? Number(teacherFilter) : undefined,
        subject_id: subjectFilter ? Number(subjectFilter) : undefined,
        school_class_id: classFilter ? Number(classFilter) : undefined,
      });
      setPlans(response.data);
      setTotal(response.meta.total);
    } catch (err) {
      setPlans([]);
      setTotal(0);
      setError(err instanceof ApiError ? err.message : t('allLessonPlans.loadError'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, canView, page, teacherFilter, subjectFilter, classFilter, t]);

  useEffect(() => {
    load();
  }, [load]);

  // `date` arrives as a bare `YYYY-MM-DD` — appending a local midnight avoids `Date` parsing it
  // as UTC and showing the day before in timezones behind it.
  const formatDate = useCallback(
    (date: string) => {
      const parsed = new Date(`${date}T00:00:00`);
      if (Number.isNaN(parsed.getTime())) {
        return date;
      }

      return parsed.toLocaleDateString(locale === 'en-US' ? 'en-US' : 'pt-BR');
    },
    [locale],
  );

  const columns: GridColDef<LessonPlan>[] = useMemo(
    () => [
      {
        field: 'teacher_name',
        headerName: t('lessons.teacher'),
        flex: 1,
        minWidth: 200,
        renderCell: ({ row }: GridRenderCellParams<LessonPlan>) =>
          row.teacher_name ?? t('common.none'),
      },
      { field: 'subject_name', headerName: t('common.subject'), width: 170 },
      { field: 'school_class_name', headerName: t('common.class'), width: 120 },
      {
        field: 'date',
        headerName: t('allLessonPlans.column.date'),
        width: 130,
        renderCell: ({ row }: GridRenderCellParams<LessonPlan>) => formatDate(row.date),
      },
      {
        field: 'topic',
        headerName: t('allLessonPlans.column.topic'),
        flex: 1.4,
        minWidth: 220,
        renderCell: ({ row }: GridRenderCellParams<LessonPlan>) => row.topic || t('common.none'),
      },
      {
        field: 'actions',
        headerName: t('common.actions'),
        width: 100,
        sortable: false,
        filterable: false,
        align: 'right',
        headerAlign: 'right',
        renderCell: ({ row }: GridRenderCellParams<LessonPlan>) => (
          <Tooltip title={t('lessonPlans.preview')}>
            <IconButton
              size="small"
              aria-label={t('allLessonPlans.previewAria', { subject: row.subject_name })}
              onClick={() => setPreviewing(row)}
            >
              <IconifyIcon icon="mingcute:eye-line" />
            </IconButton>
          </Tooltip>
        ),
      },
    ],
    [t, formatDate],
  );

  // The menu already hides this entry from anyone without `manage_academic` — this guard is the
  // one that actually matters, since a direct link must not trust the menu.
  if (!school || !canView) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title={t('nav.allLessonPlans')} />
        <SectionCard>
          <EmptyState
            title={t('common.noAccess.title')}
            description={t('allLessonPlans.noAccess.description')}
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader title={t('nav.allLessonPlans')} />

      <Typography variant="body2" color="text.secondary">
        {t('allLessonPlans.intro')}
      </Typography>

      <Stack direction="row" gap={1.5} flexWrap="wrap" alignItems="flex-end">
        <TextField
          id="all-lesson-plans-filter-teacher"
          label={t('lessons.teacher')}
          value={teacherFilter}
          onChange={(e) => setFilter('teacher_id', e.target.value)}
          variant="filled"
          size="small"
          select
          sx={{ width: 220 }}
        >
          <MenuItem value="">{t('allLessonPlans.filter.allTeachers')}</MenuItem>
          {teachers.map((teacher) => (
            <MenuItem key={teacher.id} value={String(teacher.id)}>
              {teacher.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          id="all-lesson-plans-filter-subject"
          label={t('common.subject')}
          value={subjectFilter}
          onChange={(e) => setFilter('subject_id', e.target.value)}
          variant="filled"
          size="small"
          select
          sx={{ width: 180 }}
        >
          <MenuItem value="">{t('common.all')}</MenuItem>
          {subjects.map((subject) => (
            <MenuItem key={subject.id} value={String(subject.id)}>
              {subject.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          id="all-lesson-plans-filter-class"
          label={t('common.class')}
          value={classFilter}
          onChange={(e) => setFilter('school_class_id', e.target.value)}
          variant="filled"
          size="small"
          select
          sx={{ width: 280 }}
        >
          <MenuItem value="">{t('common.all')}</MenuItem>
          {classes.map((schoolClass) => (
            <MenuItem key={schoolClass.id} value={String(schoolClass.id)}>
              {schoolClassLabel(schoolClass, t)}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {error && <ErrorBanner message={error} />}

      <SectionCard padding={0}>
        {!loading && plans.length === 0 && !error ? (
          <EmptyState
            title={t('allLessonPlans.empty.title')}
            description={t('allLessonPlans.empty.description')}
            headingLevel={2}
          />
        ) : (
          <Box px={3.5} py={3.5} sx={{ height: 594, width: 1 }}>
            <DataTable
              rows={plans}
              columns={columns}
              loading={loading}
              disableRowSelectionOnClick
              rowHeight={64}
              columnHeaderHeight={56}
              paginationMode="server"
              rowCount={total}
              pageSizeOptions={[PAGE_SIZE]}
              paginationModel={{ page, pageSize: PAGE_SIZE }}
              onPaginationModelChange={(model) => setPage(model.page)}
              rangeLabel={({ from, to, count }) => t('common.range', { from, to, count })}
            />
          </Box>
        )}
      </SectionCard>

      <LessonPlanPreviewDialog
        open={Boolean(previewing)}
        schoolId={school.school_id}
        lessonPlan={previewing}
        subjectName={previewing?.subject_name}
        onClose={() => setPreviewing(null)}
      />
    </Stack>
  );
};

export default AllLessonPlans;
