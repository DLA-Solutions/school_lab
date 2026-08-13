import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import ListSubheader from '@mui/material/ListSubheader';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import IconifyIcon from 'components/base/IconifyIcon';
import {
  ConfirmDialog,
  DataTable,
  EmptyState,
  ErrorBanner,
  PageHeader,
  SectionCard,
} from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { useCurrentSchool } from 'providers/useCurrentSchool';
import { createSchoolClass, deleteSchoolClass, listSchoolClasses, updateSchoolClass } from 'services/academicsApi';
import { ApiError } from 'services/api';
import { SchoolClass } from 'types/academics';
import { GRADE_LEVELS, GRADE_SEGMENTS, gradeLevelLabel } from 'utils/gradeLevels';

const PAGE_SIZE = 25;

type FormField = 'name' | 'grade_level' | 'year';

type FormState = Record<FormField, string>;

const emptyForm = (): FormState => ({
  name: '',
  grade_level: '',
  year: String(new Date().getFullYear()),
});

const renderGrade = ({ value }: GridRenderCellParams<SchoolClass, string>) => (
  <Typography variant="body2">{gradeLevelLabel(value)}</Typography>
);

/** The subjects taught in the cohort — derived from its teaching assignments. */
const renderSubjects =
  (noneLabel: string) =>
  ({ row }: GridRenderCellParams<SchoolClass>) =>
    row.subjects.length === 0 ? (
      <Typography variant="body2" color="text.secondary">
        {noneLabel}
      </Typography>
    ) : (
      <Stack direction="row" gap={0.75} flexWrap="wrap" alignItems="center" py={1}>
        {row.subjects.map((subject) => (
          <Chip key={subject.id} size="small" variant="outlined" label={subject.name} />
        ))}
      </Stack>
    );

const SchoolClasses = () => {
  const { t } = useTranslation();
  const school = useCurrentSchool();
  const schoolId = school?.school_id ?? null;

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolClass | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FormField, string>>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [pendingDelete, setPendingDelete] = useState<SchoolClass | null>(null);

  const load = useCallback(async () => {
    if (!schoolId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await listSchoolClasses(schoolId, page + 1);
      setClasses(response.data);
      setTotal(response.meta.total);
    } catch (err) {
      setClasses([]);
      setTotal(0);
      setError(err instanceof ApiError ? err.message : t('classes.loadError'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, page, t]);

  useEffect(() => {
    load();
  }, [load]);

  const openForm = (schoolClass: SchoolClass | null) => {
    setEditing(schoolClass);
    setForm(
      schoolClass
        ? {
            name: schoolClass.name,
            grade_level: schoolClass.grade_level,
            year: String(schoolClass.year),
          }
        : emptyForm(),
    );
    setFieldErrors({});
    setFormError('');
    setFormOpen(true);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
    setFormError('');
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!schoolId) {
      return;
    }

    const errors: Partial<Record<FormField, string>> = {};
    if (!form.name.trim()) {
      errors.name = t('classes.nameRequired');
    }
    if (!form.grade_level) {
      errors.grade_level = t('classes.gradeRequired');
    }
    if (!form.year || Number.isNaN(Number(form.year))) {
      errors.year = t('classes.yearRequired');
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSaving(true);
    setFormError('');

    const payload = {
      name: form.name.trim(),
      grade_level: form.grade_level,
      year: Number(form.year),
    };

    try {
      if (editing) {
        await updateSchoolClass(schoolId, editing.id, payload);
      } else {
        await createSchoolClass(schoolId, payload);
      }

      setFormOpen(false);
      setEditing(null);
      load();
    } catch (err) {
      if (err instanceof ApiError) {
        const mapped: Partial<Record<FormField, string>> = {};
        Object.entries(err.details).forEach(([key, value]) => {
          if (key in form && Array.isArray(value) && typeof value[0] === 'string') {
            mapped[key as FormField] = value[0];
          }
        });
        setFieldErrors(mapped);
        if (Object.keys(mapped).length === 0) {
          setFormError(err.message);
        }
      } else {
        setFormError(t('common.saveConnectionError'));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!schoolId || !pendingDelete) {
      return;
    }

    try {
      await deleteSchoolClass(schoolId, pendingDelete.id);
      setPendingDelete(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('classes.deleteError'));
      setPendingDelete(null);
    }
  };

  const columns: GridColDef<SchoolClass>[] = useMemo(
    () => [
      { field: 'grade_level', headerName: t('common.grade'), width: 210, renderCell: renderGrade },
      { field: 'name', headerName: t('common.class'), width: 100 },
      { field: 'year', headerName: t('common.year'), width: 90 },
      { field: 'student_count', headerName: t('common.students'), width: 90 },
      {
        field: 'subjects',
        headerName: t('common.subjects'),
        flex: 1,
        minWidth: 220,
        sortable: false,
        renderCell: renderSubjects(t('common.noneFeminine')),
      },
      {
        field: 'actions',
        headerName: t('common.actions'),
        width: 110,
        sortable: false,
        filterable: false,
        align: 'right',
        headerAlign: 'right',
        renderCell: ({ row }: GridRenderCellParams<SchoolClass>) => (
          <Stack direction="row" spacing={0.5} justifyContent="flex-end" height={1}>
            <Tooltip title={t('common.edit')}>
              <IconButton
                size="small"
                aria-label={t('classes.editAria', { name: row.name })}
                onClick={() => openForm(row)}
              >
                <IconifyIcon icon="mingcute:edit-2-line" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('common.delete')}>
              <IconButton
                size="small"
                aria-label={t('classes.deleteAria', { name: row.name })}
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
        <PageHeader title={t('classes.title')} />
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
      <PageHeader
        title={t('classes.title')}
        actions={
          <Button variant="contained" size="small" onClick={() => openForm(null)}>
            {t('classes.new')}
          </Button>
        }
      />

      {error && <ErrorBanner message={error} />}

      <SectionCard padding={0}>
        {!loading && classes.length === 0 && !error ? (
          <EmptyState
            title={t('classes.empty.title')}
            description={t('classes.empty.description')}
            action={
              <Button variant="contained" size="small" onClick={() => openForm(null)}>
                {t('classes.new')}
              </Button>
            }
          />
        ) : (
          <Box px={3.5} py={3.5} sx={{ height: 594, width: 1 }}>
            <DataTable
              rows={classes}
              columns={columns}
              loading={loading}
              disableRowSelectionOnClick
              getRowHeight={() => 'auto'}
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

      <Dialog open={formOpen} onClose={saving ? undefined : () => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? t('classes.edit') : t('classes.new')}</DialogTitle>
        <Stack component="form" onSubmit={handleSubmit} direction="column" noValidate>
          <DialogContent>
            <Grid container spacing={2.5} pt={0.5}>
              <Grid size={{ xs: 12, sm: 6 }}>
                {/* Grouped by segment: "5º ano" alone is ambiguous across Fundamental I and II. */}
                <TextField
                  id="class-grade-level"
                  name="grade_level"
                  label={t('common.grade')}
                  value={form.grade_level}
                  onChange={handleChange}
                  error={Boolean(fieldErrors.grade_level)}
                  helperText={fieldErrors.grade_level}
                  disabled={saving}
                  variant="filled"
                  fullWidth
                  required
                  select
                >
                  {GRADE_SEGMENTS.flatMap((segment) => [
                    <ListSubheader key={segment}>{segment}</ListSubheader>,
                    ...GRADE_LEVELS.filter((grade) => grade.segment === segment).map((grade) => (
                      <MenuItem key={grade.value} value={grade.value}>
                        {grade.label}
                      </MenuItem>
                    )),
                  ])}
                </TextField>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField
                  id="class-name"
                  name="name"
                  label={t('common.class')}
                  placeholder="A"
                  value={form.name}
                  onChange={handleChange}
                  error={Boolean(fieldErrors.name)}
                  helperText={fieldErrors.name}
                  disabled={saving}
                  variant="filled"
                  fullWidth
                  required
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField
                  id="class-year"
                  name="year"
                  label={t('common.schoolYear')}
                  type="number"
                  value={form.year}
                  onChange={handleChange}
                  error={Boolean(fieldErrors.year)}
                  helperText={fieldErrors.year}
                  disabled={saving}
                  variant="filled"
                  fullWidth
                  required
                />
              </Grid>
              {formError && (
                <Grid size={12}>
                  <ErrorBanner message={formError} />
                </Grid>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setFormOpen(false)} color="inherit" disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={saving}
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          </DialogActions>
        </Stack>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={t('classes.deleteTitle')}
        message={t('classes.deleteMessage', {
          grade: gradeLevelLabel(pendingDelete?.grade_level),
          name: pendingDelete?.name ?? '',
        })}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </Stack>
  );
};

export default SchoolClasses;
