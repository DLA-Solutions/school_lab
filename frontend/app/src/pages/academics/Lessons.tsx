import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import IconifyIcon from 'components/base/IconifyIcon';
import LessonFormDialog from 'components/sections/academics/LessonFormDialog';
import SchoolClasses from 'pages/academics/SchoolClasses';
import Subjects from 'pages/academics/Subjects';
import {
  ConfirmDialog,
  DataTable,
  EmptyState,
  ErrorBanner,
  PageHeader,
  SearchField,
  SectionCard,
} from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { useCurrentSchool } from 'providers/useCurrentSchool';
import { ApiError } from 'services/api';
import {
  listSchoolClasses,
  listSubjects,
  listTeachingAssignments,
  removeTeachingAssignment,
} from 'services/academicsApi';
import { SchoolClass, Subject, TeachingAssignment } from 'types/academics';
import { useDebouncedValue } from 'utils/useDebouncedValue';

const PAGE_SIZE = 25;

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR + 1, CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

type LessonsTab = 'lessons' | 'classes' | 'subjects';

/**
 * "Aulas": the school's teaching seen as what it actually is — a teacher, a subject, and the
 * cohort they teach it to. The three together are the unit, so this lists assignments rather than
 * teachers with their classes folded underneath, which is how Colaboradores used to show it.
 *
 * Turmas and Matérias live here too, as tabs: they are what a lesson is made of, and keeping them
 * three clicks apart in the menu made an obvious sequence feel like three unrelated screens.
 */
const Lessons = () => {
  const { t } = useTranslation();
  const school = useCurrentSchool();
  const schoolId = school?.school_id ?? null;

  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get('tab') ?? 'lessons') as LessonsTab;

  const [assignments, setAssignments] = useState<TeachingAssignment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<TeachingAssignment | null>(null);
  const [deleting, setDeleting] = useState(false);

  const search = searchParams.get('q') ?? '';
  const classFilter = searchParams.get('school_class_id') ?? '';
  const subjectFilter = searchParams.get('subject_id') ?? '';
  const yearFilter = searchParams.get('year') ?? '';
  const debouncedSearch = useDebouncedValue(search);

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

  const load = useCallback(async () => {
    if (!schoolId || tab !== 'lessons') {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await listTeachingAssignments(schoolId, {
        page: page + 1,
        q: debouncedSearch,
        school_class_id: classFilter,
        subject_id: subjectFilter,
        year: yearFilter,
      });
      setAssignments(response.data);
      setTotal(response.meta.total);
    } catch (err) {
      setAssignments([]);
      setTotal(0);
      setError(err instanceof ApiError ? err.message : t('lessons.loadError'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, tab, page, debouncedSearch, classFilter, subjectFilter, yearFilter, t]);

  useEffect(() => {
    load();
  }, [load]);

  // The two selects are filters, not a form, so they are loaded once rather than per keystroke.
  useEffect(() => {
    if (!schoolId) {
      return;
    }

    const loadOptions = async () => {
      try {
        const [classesResponse, subjectsResponse] = await Promise.all([
          listSchoolClasses(schoolId),
          listSubjects(schoolId),
        ]);
        setClasses(classesResponse.data);
        setSubjects(subjectsResponse.data);
      } catch {
        // Empty selects are signal enough; the listing itself reports anything worse.
        setClasses([]);
        setSubjects([]);
      }
    };

    loadOptions();
  }, [schoolId]);

  const handleConfirmDelete = async () => {
    if (!schoolId || !pendingDelete) {
      return;
    }

    setDeleting(true);

    try {
      await removeTeachingAssignment(schoolId, pendingDelete.id);
      setPendingDelete(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('lessons.deleteError'));
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const columns: GridColDef<TeachingAssignment>[] = useMemo(
    () => [
      { field: 'teacher_name', headerName: t('lessons.teacher'), width: 200 },
      { field: 'subject_name', headerName: t('common.subject'), width: 170 },
      {
        field: 'school_class',
        headerName: t('common.class'),
        flex: 1,
        minWidth: 300,
        sortable: false,
        valueGetter: (value: TeachingAssignment['school_class']) => value.label,
        renderCell: ({ row }: GridRenderCellParams<TeachingAssignment>) => (
          <Typography variant="body2" noWrap title={row.school_class.label}>
            {row.school_class.label}
          </Typography>
        ),
      },
      {
        field: 'actions',
        headerName: t('common.actions'),
        width: 90,
        sortable: false,
        filterable: false,
        align: 'right',
        headerAlign: 'right',
        renderCell: ({ row }: GridRenderCellParams<TeachingAssignment>) => (
          <Stack direction="row" justifyContent="flex-end" height={1}>
            <Tooltip title={t('common.delete')}>
              <IconButton
                size="small"
                aria-label={t('lessons.deleteAria', {
                  teacher: row.teacher_name,
                  subject: row.subject_name,
                })}
                onClick={() => setPendingDelete(row)}
              >
                <IconifyIcon icon="mingcute:delete-2-line" />
              </IconButton>
            </Tooltip>
          </Stack>
        ),
      },
    ],
    [t],
  );

  if (!school) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title={t('nav.lessons')} />
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

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader title={t('nav.lessons')} />

      <Tabs value={tab} onChange={(_, value: LessonsTab) => setFilter('tab', value)}>
        <Tab value="lessons" label={t('nav.lessons')} />
        <Tab value="classes" label={t('nav.classes')} />
        <Tab value="subjects" label={t('nav.subjects')} />
      </Tabs>

      {/* Under the tabs, where Turmas and Matérias put their own: the controls belong to the tab
          they filter, not to the page that holds all three. */}
      {tab === 'lessons' && (
        <Stack direction="row" gap={1.5} flexWrap="wrap" alignItems="center">
          <SearchField
            value={search}
            onChange={(e) => setFilter('q', e.target.value)}
            placeholder={t('lessons.searchPlaceholder')}
            ariaLabel={t('lessons.searchAria')}
            sx={{ width: 240 }}
          />
          <TextField
            id="lessons-filter-class"
            label={t('common.class')}
            value={classFilter}
            onChange={(e) => setFilter('school_class_id', e.target.value)}
            variant="filled"
            size="small"
            select
            sx={{ width: 120 }}
          >
            <MenuItem value="">{t('common.all')}</MenuItem>
            {/* The letter alone: the year is its own filter, and repeating it here made the same
                cohort look like several. */}
            {classes.map((schoolClass) => (
              <MenuItem key={schoolClass.id} value={String(schoolClass.id)}>
                {schoolClass.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            id="lessons-filter-subject"
            label={t('common.subject')}
            value={subjectFilter}
            onChange={(e) => setFilter('subject_id', e.target.value)}
            variant="filled"
            size="small"
            select
            sx={{ width: 170 }}
          >
            <MenuItem value="">{t('common.all')}</MenuItem>
            {subjects.map((subject) => (
              <MenuItem key={subject.id} value={String(subject.id)}>
                {subject.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            id="lessons-filter-year"
            label={t('common.year')}
            value={yearFilter}
            onChange={(e) => setFilter('year', e.target.value)}
            variant="filled"
            size="small"
            select
            sx={{ width: 120 }}
          >
            <MenuItem value="">{t('common.all')}</MenuItem>
            {YEAR_OPTIONS.map((year) => (
              <MenuItem key={year} value={String(year)}>
                {year}
              </MenuItem>
            ))}
          </TextField>
          <Button variant="contained" size="small" onClick={() => setFormOpen(true)}>
            {t('lessons.new')}
          </Button>
        </Stack>
      )}

      {/* Turmas and Matérias keep their own pages, headers and all: they are reached from here
          rather than reimplemented here. */}
      {tab === 'classes' && <SchoolClasses />}
      {tab === 'subjects' && <Subjects />}

      {tab === 'lessons' && (
        <>
          {error && <ErrorBanner message={error} />}

          <SectionCard padding={0}>
            {!loading && assignments.length === 0 && !error ? (
              <EmptyState
                title={t('lessons.empty.title')}
                description={t('lessons.empty.description')}
                action={
                  <Button variant="contained" size="small" onClick={() => setFormOpen(true)}>
                    {t('lessons.new')}
                  </Button>
                }
              />
            ) : (
              <Box px={3.5} py={3.5} sx={{ height: 594, width: 1 }}>
                <DataTable
                  rows={assignments}
                  columns={columns}
                  loading={loading}
                  disableRowSelectionOnClick
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
        </>
      )}

      <LessonFormDialog
        key={String(formOpen)}
        open={formOpen}
        schoolId={school.school_id}
        classes={classes}
        subjects={subjects}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          load();
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={t('lessons.deleteTitle')}
        message={t('lessons.deleteMessage', {
          teacher: pendingDelete?.teacher_name ?? '',
          subject: pendingDelete?.subject_name ?? '',
          schoolClass: pendingDelete?.school_class.label ?? '',
        })}
        confirmLabel={deleting ? t('common.deleting') : t('common.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </Stack>
  );
};

export default Lessons;
