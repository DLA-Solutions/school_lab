import { FormEvent, useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { EmptyState, ErrorBanner } from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import {
  assignTeaching,
  listSchoolClasses,
  listSubjects,
  removeTeachingAssignment,
} from 'services/academicsApi';
import { ApiError } from 'services/api';
import { SchoolClass, Subject, Teacher } from 'types/academics';
import { schoolClassLabel } from 'utils/schoolClassLabel';

export interface TeacherAssignmentsDialogProps {
  open: boolean;
  schoolId: number;
  teacher: Teacher;
  onClose: () => void;
  /** Lets the listing behind the dialog pick up the new assignments. */
  onChanged: () => void;
}

const TeacherAssignmentsDialog = ({
  open,
  schoolId,
  teacher,
  onClose,
  onChanged,
}: TeacherAssignmentsDialogProps) => {
  // Only the cohort labels are translated here — the rest of this dialog is pt-BR copy.
  const { t } = useTranslation();
  // Seeded from the row that opened the dialog, then kept current by each successful change —
  // the API returns the teacher with every assignment regrouped.
  const [current, setCurrent] = useState<Teacher>(teacher);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [schoolClassId, setSchoolClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [classList, subjectList] = await Promise.all([
          listSchoolClasses(schoolId),
          listSubjects(schoolId),
        ]);
        setClasses(classList.data);
        setSubjects(subjectList.data);
      } catch {
        setClasses([]);
        setSubjects([]);
      }
    };

    loadOptions();
  }, [schoolId]);

  const handleAssign = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!schoolClassId || !subjectId) {
      setError('Selecione a turma e a matéria.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const updated = await assignTeaching(schoolId, teacher.id, {
        schoolClassId: Number(schoolClassId),
        subjectId: Number(subjectId),
      });

      setCurrent(updated);
      setSubjectId('');
      onChanged();
    } catch (err) {
      if (err instanceof ApiError) {
        // The duplicate rule lands on `school_class_id`; a cross-school record on `school_class`.
        const detail =
          err.details.school_class_id ?? err.details.school_class ?? err.details.subject;
        setError(
          Array.isArray(detail) && typeof detail[0] === 'string'
            ? `Turma/matéria ${detail[0]}.`
            : err.message,
        );
      } else {
        setError('Não foi possível atribuir. Verifique sua conexão.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (assignmentId: number) => {
    setRemovingId(assignmentId);
    setError('');

    try {
      await removeTeachingAssignment(schoolId, assignmentId);

      // Drop it locally rather than refetching the teacher: the row is already known.
      setCurrent((teacherState) => ({
        ...teacherState,
        classes: teacherState.classes
          .map((schoolClass) => ({
            ...schoolClass,
            subjects: schoolClass.subjects.filter(
              (subject) => subject.assignment_id !== assignmentId,
            ),
          }))
          .filter((schoolClass) => schoolClass.subjects.length > 0),
      }));
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível remover a atribuição.');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Turmas e matérias
        <Typography variant="body2" color="text.secondary">
          {current.name}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Stack direction="column" gap={2.5} pt={0.5}>
          {error && <ErrorBanner message={error} />}

          {current.classes.length === 0 ? (
            <EmptyState
              title="Nenhuma turma atribuída"
              description="Atribua uma turma e a matéria que este professor dá nela."
            />
          ) : (
            <Stack direction="column" gap={2}>
              {current.classes.map((schoolClass) => (
                <Stack key={schoolClass.id} direction="column" gap={1}>
                  <Typography variant="body2">
                    {schoolClassLabel(schoolClass, t)}
                  </Typography>
                  <Stack direction="row" gap={0.75} flexWrap="wrap">
                    {schoolClass.subjects.map((subject) => (
                      <Chip
                        key={subject.assignment_id}
                        size="small"
                        variant="outlined"
                        label={subject.name}
                        onDelete={() => handleRemove(subject.assignment_id)}
                        disabled={removingId === subject.assignment_id}
                      />
                    ))}
                  </Stack>
                </Stack>
              ))}
            </Stack>
          )}

          <Divider />

          <Stack component="form" onSubmit={handleAssign} direction="column" gap={2} noValidate>
            <Typography variant="body2" color="text.secondary">
              Atribuir turma e matéria
            </Typography>

            {classes.length === 0 && (
              <Typography variant="caption" color="text.secondary">
                Nenhuma turma cadastrada. Crie uma em Turmas antes de atribuir.
              </Typography>
            )}
            {subjects.length === 0 && (
              <Typography variant="caption" color="text.secondary">
                Nenhuma matéria cadastrada. Crie uma em Matérias antes de atribuir.
              </Typography>
            )}

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  id="assignment-school-class"
                  label="Turma"
                  value={schoolClassId}
                  onChange={(e) => setSchoolClassId(e.target.value)}
                  disabled={saving || classes.length === 0}
                  variant="filled"
                  select
                  fullWidth
                >
                  {classes.map((schoolClass) => (
                    <MenuItem key={schoolClass.id} value={String(schoolClass.id)}>
                      {schoolClassLabel(schoolClass, t)}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  id="assignment-subject"
                  label="Matéria"
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  disabled={saving || subjects.length === 0}
                  variant="filled"
                  select
                  fullWidth
                >
                  {subjects.map((subject) => (
                    <MenuItem key={subject.id} value={String(subject.id)}>
                      {subject.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>

            <Stack direction="row" justifyContent="flex-end">
              <Button
                type="submit"
                variant="contained"
                disabled={saving || classes.length === 0 || subjects.length === 0}
                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
              >
                {saving ? 'Atribuindo...' : 'Atribuir'}
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit" disabled={saving}>
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TeacherAssignmentsDialog;
