import { useEffect, useState } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ErrorBanner } from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { ApiError } from 'services/api';
import { createIncident } from 'services/incidentsApi';
import { listStudents } from 'services/studentsApi';
import { IncidentStudentOption } from 'types/incidents';
import { useDebouncedValue } from 'utils/useDebouncedValue';

export interface IncidentFormDialogProps {
  open: boolean;
  schoolId: number;
  /**
   * The teacher's own roll (BR-IN03) — a fixed, already-narrowed list, so the picker filters it
   * client-side rather than searching the school-wide register the teacher has no access to
   * (`people/students` is gated on `manage_people`). Absent for `manage_academic` staff, who
   * instead search the whole school below.
   */
  teacherRoll?: IncidentStudentOption[];
  onClose: () => void;
  onCreated: () => void;
}

/**
 * The "nota ata" popup — the Ata menu entry's own create flow (`docs/prds/academic/incidents.md`
 * UC-IN01). Deliberately narrow: no category/severity/visibility picker, since this entry point
 * is specifically the parent-meeting flavor — the API resolves the seeded "Reunião com os pais"
 * type and its default visibility on its own when `incident_type_id` is left out
 * (`Academic::CreateIncidentService`). A fuller incident form, with its own type catalog, is a
 * separate screen the PRD leaves open.
 */
const IncidentFormDialog = ({
  open,
  schoolId,
  teacherRoll,
  onClose,
  onCreated,
}: IncidentFormDialogProps) => {
  const { t } = useTranslation();
  const isTeacher = teacherRoll !== undefined;

  const [student, setStudent] = useState<IncidentStudentOption | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const debouncedStudentSearch = useDebouncedValue(studentSearch);
  const [studentOptions, setStudentOptions] = useState<IncidentStudentOption[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);

  const [guardianPointsRaised, setGuardianPointsRaised] = useState('');
  const [schoolResponse, setSchoolResponse] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      return;
    }

    setStudent(null);
    setStudentSearch('');
    setGuardianPointsRaised('');
    setSchoolResponse('');
    setError('');
  }, [open]);

  // Teacher mode: the roll is already the whole option set — no network call per keystroke.
  useEffect(() => {
    if (isTeacher) {
      setStudentOptions(teacherRoll ?? []);
    }
  }, [isTeacher, teacherRoll]);

  // manage_academic staff mode: search the school-wide register as the coordinator types,
  // mirroring the payer search in `Charges.tsx`.
  useEffect(() => {
    if (!open || isTeacher) {
      return;
    }

    let current = true;
    setStudentsLoading(true);

    const search = async () => {
      try {
        const response = await listStudents({ schoolId, q: debouncedStudentSearch });
        if (current) {
          setStudentOptions(
            response.data.map((row) => ({
              id: row.id,
              name: row.name,
              school_class_name: row.school_class_name,
            })),
          );
        }
      } catch {
        if (current) {
          setStudentOptions([]);
        }
      } finally {
        if (current) {
          setStudentsLoading(false);
        }
      }
    };

    search();

    return () => {
      current = false;
    };
  }, [open, isTeacher, schoolId, debouncedStudentSearch]);

  const canSave =
    Boolean(student) && Boolean(guardianPointsRaised.trim() || schoolResponse.trim());

  const save = async () => {
    if (!student || !canSave) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      await createIncident(schoolId, {
        student_id: student.id,
        guardian_points_raised: guardianPointsRaised.trim() || undefined,
        school_response: schoolResponse.trim() || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('atas.form.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const studentLabel = (option: IncidentStudentOption) =>
    option.school_class_name ? `${option.name} — ${option.school_class_name}` : option.name;

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('atas.form.title')}</DialogTitle>
      <DialogContent>
        <Stack direction="column" gap={2} pt={1}>
          <Typography variant="body2" color="text.secondary">
            {t('atas.form.description')}
          </Typography>

          {error && <ErrorBanner message={error} />}

          <Autocomplete
            id="ata-student"
            options={studentOptions}
            value={student}
            onChange={(_, option) => setStudent(option)}
            onInputChange={(_, term) => setStudentSearch(term)}
            getOptionLabel={studentLabel}
            isOptionEqualToValue={(option, selected) => option.id === selected.id}
            // The teacher's roll is filtered client-side (small, fixed list); the staff search
            // already matched server-side, and filtering again would drop rows it returned.
            filterOptions={isTeacher ? undefined : (options) => options}
            loading={!isTeacher && studentsLoading}
            noOptionsText={
              isTeacher || studentSearch ? t('atas.form.noStudentFound') : t('atas.form.typeToSearch')
            }
            disabled={saving}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t('common.student')}
                variant="filled"
                size="small"
                required
              />
            )}
          />

          <TextField
            id="ata-guardian-points"
            label={t('atas.form.guardianPointsRaised')}
            value={guardianPointsRaised}
            onChange={(event) => setGuardianPointsRaised(event.target.value)}
            variant="filled"
            size="small"
            multiline
            minRows={3}
            fullWidth
            disabled={saving}
          />

          <TextField
            id="ata-school-response"
            label={t('atas.form.schoolResponse')}
            value={schoolResponse}
            onChange={(event) => setSchoolResponse(event.target.value)}
            variant="filled"
            size="small"
            multiline
            minRows={3}
            fullWidth
            disabled={saving}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={save}
          disabled={saving || !canSave}
          startIcon={saving ? <CircularProgress size={16} /> : undefined}
        >
          {t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default IncidentFormDialog;
