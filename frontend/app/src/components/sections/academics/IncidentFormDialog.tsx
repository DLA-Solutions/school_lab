import { useEffect, useState } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
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
import { listGuardians } from 'services/guardiansApi';
import { createIncident } from 'services/incidentsApi';
import { listStudents } from 'services/studentsApi';
import { Guardian } from 'types/guardian';
import { IncidentStudentOption } from 'types/incidents';
import { useDebouncedValue } from 'utils/useDebouncedValue';
import type { MessageKey } from 'locales';

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

// Mirrors `StudentGuardian::RELATIONSHIPS` — same `students.relationship.*` catalogue the
// register and the Ata grid already use. `null` covers a guardian added through the search
// field below, whose relationship to this particular student is not yet known client-side (the
// API resolves and snapshots the real one at save time regardless of what this chip shows).
const RELATIONSHIP_KEYS: Record<'father' | 'mother' | 'other', MessageKey> = {
  father: 'students.relationship.father',
  mother: 'students.relationship.mother',
  other: 'students.relationship.other',
};

interface GuardianChecklistEntry {
  guardianId: number;
  name: string;
  relationship: 'father' | 'mother' | 'other' | null;
  checked: boolean;
}

/**
 * The "nota ata" popup — the Ata menu entry's own create flow (`docs/prds/academic/incidents.md`
 * UC-IN01). Deliberately narrow: no category/severity/visibility picker, since this entry point
 * is specifically the parent-meeting flavor — the API resolves the seeded "Reunião com os pais"
 * type and its default visibility on its own when `incident_type_id` is left out
 * (`Academic::CreateIncidentService`). A fuller incident form, with its own type catalog, is a
 * separate screen the PRD leaves open.
 *
 * BR-IN11/UC-IN06 (manage_academic staff only — `GuardianPolicy#index?` requires `manage_people`,
 * which a plain `teacher` membership never holds): a second search field finds a student by a
 * linked guardian's name instead of the student's own, and once a student is picked, the
 * guardians to snapshot on the ata are shown as an editable, pre-checked chip list. The teacher
 * "nota ata" flow is untouched — it never shows this and never sends `guardian_ids`, so the API's
 * existing default (snapshot the student's current guardians automatically) keeps applying.
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

  // BR-IN11: searching by a guardian's name narrows the student field above to that guardian's
  // children before a student is picked. Once a student exists, picking a guardian here instead
  // adds them to the checklist below — the search field is reused, not duplicated.
  const [guardianFilter, setGuardianFilter] = useState<Guardian | null>(null);
  const [guardianSearch, setGuardianSearch] = useState('');
  const debouncedGuardianSearch = useDebouncedValue(guardianSearch);
  const [guardianOptions, setGuardianOptions] = useState<Guardian[]>([]);
  const [guardianSearchLoading, setGuardianSearchLoading] = useState(false);

  const [guardianChecklist, setGuardianChecklist] = useState<GuardianChecklistEntry[]>([]);
  const [guardianChecklistLoading, setGuardianChecklistLoading] = useState(false);
  // Whether the creator has actually touched the checklist (toggled a pre-filled guardian, or
  // added one via search) — only then is `guardian_ids` sent at all, so an untouched form keeps
  // relying on the API's own default snapshot rather than restating it.
  const [guardiansTouched, setGuardiansTouched] = useState(false);

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
    setGuardianFilter(null);
    setGuardianSearch('');
    setGuardianChecklist([]);
    setGuardiansTouched(false);
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
  // mirroring the payer search in `Charges.tsx`. `guardianFilter` (BR-IN11) narrows this to one
  // guardian's children once the coordinator has searched by parent name instead.
  useEffect(() => {
    if (!open || isTeacher) {
      return;
    }

    let current = true;
    setStudentsLoading(true);

    const search = async () => {
      try {
        const response = await listStudents({
          schoolId,
          q: debouncedStudentSearch,
          guardianId: guardianFilter?.id,
        });
        if (current) {
          setStudentOptions(
            response.data.map((row) => ({
              id: row.id,
              name: row.name,
              school_class_name: row.school_class_name,
              guardians: row.guardians,
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
  }, [open, isTeacher, schoolId, debouncedStudentSearch, guardianFilter]);

  // The "Buscar por responsável" options — same search-as-you-type as the student field, just
  // against guardians instead (staff mode only; see the GuardianPolicy note above).
  useEffect(() => {
    if (!open || isTeacher) {
      return;
    }

    let current = true;
    setGuardianSearchLoading(true);

    const search = async () => {
      try {
        const response = await listGuardians({ schoolId, q: debouncedGuardianSearch });
        if (current) {
          setGuardianOptions(response.data);
        }
      } catch {
        if (current) {
          setGuardianOptions([]);
        }
      } finally {
        if (current) {
          setGuardianSearchLoading(false);
        }
      }
    };

    search();

    return () => {
      current = false;
    };
  }, [open, isTeacher, schoolId, debouncedGuardianSearch]);

  // BR-IN11/AC-IN08: once a student is picked (staff mode), pre-fill the checklist from the
  // guardian picker's own endpoint (`GET .../people/guardians?student_id=`) — the freshest read
  // of who is actually linked right now. That endpoint carries no relationship, so the label is
  // enriched from the picked option's own `guardians` (already relationship-tagged by
  // `StudentBlueprint`) when the id matches; otherwise the chip shows the name alone. The teacher
  // roll never reaches this effect (isTeacher short-circuits it), so the "nota ata" flow is
  // unaffected — it keeps relying on the API's own default snapshot.
  useEffect(() => {
    if (!student || isTeacher) {
      setGuardianChecklist([]);
      setGuardiansTouched(false);
      return;
    }

    let current = true;
    setGuardianChecklistLoading(true);
    setGuardiansTouched(false);

    const relationshipById = new Map((student.guardians ?? []).map((link) => [link.id, link.relationship]));

    listGuardians({ schoolId, studentId: student.id })
      .then((response) => {
        if (current) {
          setGuardianChecklist(
            response.data.map((guardian) => ({
              guardianId: guardian.id,
              name: guardian.name,
              relationship: relationshipById.get(guardian.id) ?? null,
              checked: true,
            })),
          );
        }
      })
      .catch(() => {
        if (current) {
          setGuardianChecklist([]);
        }
      })
      .finally(() => {
        if (current) {
          setGuardianChecklistLoading(false);
        }
      });

    return () => {
      current = false;
    };
  }, [student, isTeacher, schoolId]);

  const toggleGuardian = (guardianId: number) => {
    setGuardianChecklist((current) =>
      current.map((entry) =>
        entry.guardianId === guardianId ? { ...entry, checked: !entry.checked } : entry,
      ),
    );
    setGuardiansTouched(true);
  };

  // Before a student is chosen, picking a guardian here narrows the student field above. Once a
  // student exists, the same field instead adds the picked guardian to the checklist — the
  // "replacing the student filter" case BR-IN11 explicitly calls out as the wrong behavior here.
  const handleGuardianSearchPick = (guardian: Guardian | null) => {
    if (!guardian) {
      setGuardianFilter(null);
      return;
    }

    if (!student) {
      setGuardianFilter(guardian);
      return;
    }

    setGuardianChecklist((current) =>
      current.some((entry) => entry.guardianId === guardian.id)
        ? current
        : [...current, { guardianId: guardian.id, name: guardian.name, relationship: null, checked: true }],
    );
    setGuardiansTouched(true);
  };

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
        guardian_ids: guardiansTouched
          ? guardianChecklist.filter((entry) => entry.checked).map((entry) => entry.guardianId)
          : undefined,
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

          {!isTeacher && (
            <Autocomplete
              id="ata-guardian-search"
              options={guardianOptions}
              value={student ? null : guardianFilter}
              onChange={(_, option) => handleGuardianSearchPick(option)}
              onInputChange={(_, term) => setGuardianSearch(term)}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, selected) => option.id === selected.id}
              filterOptions={(options) => options}
              loading={guardianSearchLoading}
              noOptionsText={
                guardianSearch ? t('atas.form.noGuardianFound') : t('atas.form.typeToSearchGuardian')
              }
              disabled={saving}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t('atas.form.searchByGuardian')}
                  variant="filled"
                  size="small"
                />
              )}
            />
          )}

          <Autocomplete
            id="ata-student"
            options={studentOptions}
            value={student}
            onChange={(_, option) => {
              setStudent(option);
              setGuardianFilter(null);
            }}
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

          {!isTeacher && student && (
            <Stack direction="column" gap={1}>
              <Typography variant="body2" color="text.secondary">
                {t('atas.form.guardians')}
              </Typography>
              <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
                {guardianChecklistLoading && <CircularProgress size={16} />}
                {!guardianChecklistLoading && guardianChecklist.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    {t('atas.form.noGuardiansFound')}
                  </Typography>
                )}
                {guardianChecklist.map((entry) => (
                  <Chip
                    key={entry.guardianId}
                    label={
                      entry.relationship
                        ? `${t(RELATIONSHIP_KEYS[entry.relationship])}: ${entry.name}`
                        : entry.name
                    }
                    clickable
                    disabled={saving}
                    color={entry.checked ? 'primary' : 'default'}
                    variant={entry.checked ? 'filled' : 'outlined'}
                    onClick={() => toggleGuardian(entry.guardianId)}
                  />
                ))}
              </Stack>
            </Stack>
          )}

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
