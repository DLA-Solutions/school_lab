import { FormEvent, useEffect, useRef, useState } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ErrorBanner, InfoBanner } from 'design-system';
import IconifyIcon from 'components/base/IconifyIcon';
import { useTranslation } from 'providers/I18nContext';
import { ApiError } from 'services/api';
import { listSchoolClasses } from 'services/academicsApi';
import { listGuardians } from 'services/guardiansApi';
import { createMinutesEntry, updateMinutesEntry } from 'services/minutesApi';
import { SchoolClass } from 'types/academics';
import { Guardian } from 'types/guardian';
import {
  MinutesBook,
  MinutesEntry,
  MinutesEntryPayload,
  MinutesKind,
  MinutesParticipantPayload,
} from 'types/minutes';
import { flattenErrorDetails, minutesErrorMessage } from 'utils/api/minutesErrors';
import { formatCpf, isValidCpf, normalizeCpf } from 'utils/documentNumber';
import { schoolClassLabel } from 'utils/schoolClassLabel';
import { useDebouncedValue } from 'utils/useDebouncedValue';
import MinutesBodyEditor from './MinutesBodyEditor';

export interface MinutesEntryFormDialogProps {
  open: boolean;
  schoolId: number;
  books: MinutesBook[];
  /** Creating: the kind picked in the chooser. Editing: the entry's own (fixed) kind. */
  kind: MinutesKind;
  /** Present when editing a draft. */
  entry?: MinutesEntry | null;
  onClose: () => void;
  onSaved: (entry: MinutesEntry) => void;
}

interface ParticipantRow {
  key: number;
  name: string;
  role_label: string;
  email: string;
  /** What the user typed — never the masked value the API hands back. */
  cpf: string;
  signs: boolean;
  /** The masked CPF on file, shown as a hint while editing (the full one is write-only). */
  maskedCpf: string | null;
  membership_id: number | null;
  guardian_id: number | null;
  student_id: number | null;
}

const blankParticipant = (key: number): ParticipantRow => ({
  key,
  name: '',
  role_label: '',
  email: '',
  cpf: '',
  signs: false,
  maskedCpf: null,
  membership_id: null,
  guardian_id: null,
  student_id: null,
});

const today = () => new Date().toISOString().slice(0, 10);

/**
 * The create / edit form of an ata (UC-LA02, UC-LA03) — a draft is the only thing it ever writes.
 *
 * The client checks only what saves a round trip (required fields, a signer's e-mail and a
 * well-formed CPF); the API stays authoritative, and its `422` details — keyed by field, with
 * participant errors as `participants.<index>.<field>` and send-level ones under `base` — are
 * shown next to the field they name.
 *
 * Editing note: the API replaces the whole participant list when it is sent and never returns a
 * full CPF (BR-LA09). So the list is only sent once it has been touched; an untouched list is
 * omitted and the stored participants stay as they are. A touched list needs every signer's CPF
 * typed again.
 */
const MinutesEntryFormDialog = ({
  open,
  schoolId,
  books,
  kind,
  entry,
  onClose,
  onSaved,
}: MinutesEntryFormDialogProps) => {
  const { t } = useTranslation();
  const editing = Boolean(entry);
  const nextKey = useRef(1);

  const [bookId, setBookId] = useState('');
  const [title, setTitle] = useState('');
  const [heldOn, setHeldOn] = useState(today());
  const [body, setBody] = useState('');
  const [schoolClassId, setSchoolClassId] = useState('');
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [participantsTouched, setParticipantsTouched] = useState(false);
  const [editorKey, setEditorKey] = useState(0);

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [guardianSearch, setGuardianSearch] = useState('');
  const debouncedGuardianSearch = useDebouncedValue(guardianSearch);
  const [guardianOptions, setGuardianOptions] = useState<Guardian[]>([]);

  // Reset on every open so a previous attempt never leaks into the next ata.
  useEffect(() => {
    if (!open) {
      return;
    }

    nextKey.current = 1;
    setFieldErrors({});
    setError('');
    setGuardianSearch('');
    setParticipantsTouched(false);
    setEditorKey((current) => current + 1);

    if (entry) {
      setBookId(String(entry.minutes_book_id));
      setTitle(entry.title);
      setHeldOn(entry.held_on);
      setBody(entry.body);
      setSchoolClassId(entry.school_class_id ? String(entry.school_class_id) : '');
      setParticipants(
        entry.participants.map((participant) => ({
          key: nextKey.current++,
          name: participant.name,
          role_label: participant.role_label ?? '',
          email: participant.email ?? '',
          cpf: '',
          signs: participant.signs,
          maskedCpf: participant.cpf,
          membership_id: participant.membership_id,
          guardian_id: participant.guardian_id,
          student_id: participant.student_id,
        })),
      );
    } else {
      setBookId(books.length === 1 ? String(books[0].id) : '');
      setTitle('');
      setHeldOn(today());
      setBody('');
      setSchoolClassId('');
      setParticipants([]);
    }
    // `books` only seeds the default pick when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entry]);

  // The class select exists only for the Conselho de Classe kind (BR-LA02).
  useEffect(() => {
    if (!open || kind !== 'class_council') {
      return;
    }

    let current = true;

    const load = async () => {
      const all: SchoolClass[] = [];
      try {
        for (let page = 1; ; page += 1) {
          const response = await listSchoolClasses(schoolId, { page });
          all.push(...response.data);
          if (response.data.length === 0 || all.length >= response.meta.total) {
            break;
          }
        }
      } catch {
        // The class is optional; a list that failed to load only leaves the select short.
      }
      if (current) {
        setClasses(all);
      }
    };

    load();

    return () => {
      current = false;
    };
  }, [open, kind, schoolId]);

  // Registered guardians are a convenience — free entry always works. Staff holding no
  // `manage_people` get a `403` here, which just leaves the picker empty.
  useEffect(() => {
    if (!open) {
      return;
    }

    let current = true;

    listGuardians({ schoolId, q: debouncedGuardianSearch })
      .then((response) => {
        if (current) {
          setGuardianOptions(response.data);
        }
      })
      .catch(() => {
        if (current) {
          setGuardianOptions([]);
        }
      });

    return () => {
      current = false;
    };
  }, [open, schoolId, debouncedGuardianSearch]);

  const touch = (updater: (rows: ParticipantRow[]) => ParticipantRow[]) => {
    setParticipantsTouched(true);
    setParticipants(updater);
  };

  const updateParticipant = (key: number, patch: Partial<ParticipantRow>) =>
    touch((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  const addParticipant = (row?: Partial<ParticipantRow>) =>
    touch((rows) => [...rows, { ...blankParticipant(nextKey.current++), ...row }]);

  const addGuardian = (guardian: Guardian) =>
    addParticipant({
      name: guardian.name,
      role_label: t('common.guardian'),
      email: guardian.email ?? '',
      cpf: formatCpf(guardian.cpf),
      guardian_id: guardian.id,
    });

  const validate = () => {
    const errors: Record<string, string> = {};

    if (!bookId) errors.minutes_book_id = t('minutes.form.bookRequired');
    if (!title.trim()) errors.title = t('minutes.form.titleRequired');
    if (!heldOn) errors.held_on = t('minutes.form.heldOnRequired');

    // An untouched list is not sent, so there is nothing to check in it.
    if (participantsTouched || !editing) {
      participants.forEach((participant, index) => {
        const prefix = `participants.${index}`;

        if (!participant.name.trim()) {
          errors[`${prefix}.name`] = t('minutes.form.participantNameRequired');
        }
        if (participant.signs) {
          if (!participant.email.trim()) {
            errors[`${prefix}.email`] = t('minutes.form.signerEmailRequired');
          }
          if (!isValidCpf(participant.cpf)) {
            errors[`${prefix}.cpf`] = t('minutes.form.signerCpfInvalid');
          }
        }
      });
    }

    return errors;
  };

  const buildParticipants = (): MinutesParticipantPayload[] =>
    participants.map((participant) => ({
      name: participant.name.trim(),
      role_label: participant.role_label.trim(),
      email: participant.email.trim(),
      cpf: normalizeCpf(participant.cpf),
      signs: participant.signs,
      membership_id: participant.membership_id,
      guardian_id: participant.guardian_id,
      student_id: participant.student_id,
    }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    const errors = validate();
    setFieldErrors(errors);
    setError('');

    if (Object.keys(errors).length > 0) {
      return;
    }

    const payload: MinutesEntryPayload = {
      minutes_book_id: Number(bookId),
      title: title.trim(),
      held_on: heldOn,
      body,
      school_class_id: kind === 'class_council' && schoolClassId ? Number(schoolClassId) : null,
    };

    if (participantsTouched || !editing) {
      payload.participants = buildParticipants();
    }

    setSaving(true);

    try {
      const saved = entry
        ? await updateMinutesEntry(schoolId, entry.id, payload)
        : await createMinutesEntry(schoolId, { ...payload, kind });
      onSaved(saved);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        const details = flattenErrorDetails(err.details);
        const mapped: Record<string, string> = {};
        const unmapped: string[] = [];

        Object.entries(details).forEach(([key, message]) => {
          if (key === 'base') {
            unmapped.push(message);
          } else if (key === 'minutes_book') {
            mapped.minutes_book_id = message;
          } else if (key === 'school_class') {
            mapped.school_class_id = message;
          } else {
            mapped[key] = message;
          }
        });

        setFieldErrors(mapped);
        setError(
          unmapped.length > 0
            ? unmapped.join(' ')
            : Object.keys(details).length === 0
              ? minutesErrorMessage(err, t, 'minutes.form.saveError')
              : '',
        );
      } else {
        setError(minutesErrorMessage(err, t, 'minutes.form.saveError'));
      }
    } finally {
      setSaving(false);
    }
  };

  const fieldError = (key: string) => fieldErrors[key] || undefined;

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
    >
      <form onSubmit={submit} noValidate>
        <DialogTitle>
          {editing ? t('minutes.form.editTitle') : t('minutes.form.createTitle')}
          <Typography variant="body2" color="text.secondary">
            {t(`minutes.kind.${kind}`)}
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            {error && <ErrorBanner message={error} />}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                id="minutes-form-book"
                label={t('minutes.form.book')}
                value={bookId}
                onChange={(e) => setBookId(e.target.value)}
                error={Boolean(fieldErrors.minutes_book_id)}
                helperText={fieldError('minutes_book_id')}
                variant="filled"
                size="small"
                select
                required
                fullWidth
              >
                {books.map((book) => (
                  <MenuItem key={book.id} value={String(book.id)}>
                    {`${book.name} (${book.year})`}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                id="minutes-form-held-on"
                label={t('minutes.form.heldOn')}
                type="date"
                value={heldOn}
                onChange={(e) => setHeldOn(e.target.value)}
                error={Boolean(fieldErrors.held_on)}
                helperText={fieldError('held_on')}
                variant="filled"
                size="small"
                required
                sx={{ minWidth: 200 }}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>

            <TextField
              id="minutes-form-title"
              label={t('minutes.form.title')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              error={Boolean(fieldErrors.title)}
              helperText={fieldError('title')}
              variant="filled"
              size="small"
              required
              fullWidth
            />

            {kind === 'class_council' && (
              <TextField
                id="minutes-form-class"
                label={t('minutes.form.schoolClass')}
                value={schoolClassId}
                onChange={(e) => setSchoolClassId(e.target.value)}
                error={Boolean(fieldErrors.school_class_id)}
                helperText={fieldError('school_class_id')}
                variant="filled"
                size="small"
                select
                fullWidth
              >
                <MenuItem value="">{t('minutes.form.noClass')}</MenuItem>
                {classes.map((schoolClass) => (
                  <MenuItem key={schoolClass.id} value={String(schoolClass.id)}>
                    {schoolClassLabel(schoolClass, t)}
                  </MenuItem>
                ))}
              </TextField>
            )}

            <MinutesBodyEditor
              key={editorKey}
              initialValue={body}
              onChange={setBody}
              error={fieldError('body')}
              disabled={saving}
            />

            <Stack spacing={1.5}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                alignItems={{ xs: 'stretch', sm: 'center' }}
                justifyContent="space-between"
              >
                <Typography variant="subtitle1">{t('minutes.form.participants')}</Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <Autocomplete
                    size="small"
                    sx={{ minWidth: 280 }}
                    options={guardianOptions}
                    value={null}
                    inputValue={guardianSearch}
                    onInputChange={(_event, value, reason) => {
                      if (reason !== 'reset') {
                        setGuardianSearch(value);
                      }
                    }}
                    onChange={(_event, guardian) => {
                      if (guardian) {
                        addGuardian(guardian);
                        setGuardianSearch('');
                      }
                    }}
                    getOptionLabel={(guardian) => guardian.name}
                    filterOptions={(options) => options}
                    noOptionsText={
                      guardianSearch
                        ? t('minutes.form.noGuardianFound')
                        : t('minutes.form.typeToSearchGuardian')
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={t('minutes.form.addGuardian')}
                        variant="filled"
                        size="small"
                      />
                    )}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => addParticipant()}
                    startIcon={<IconifyIcon icon="mingcute:add-line" />}
                  >
                    {t('minutes.form.addParticipant')}
                  </Button>
                </Stack>
              </Stack>

              <InfoBanner message={t('minutes.form.participantsHint')} />

              {participants.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  {t('minutes.form.noParticipants')}
                </Typography>
              )}

              {participants.map((participant, index) => {
                const prefix = `participants.${index}`;

                return (
                  <Box
                    key={participant.key}
                    role="group"
                    aria-label={`${t('minutes.form.participants')} ${index + 1}`}
                    sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5 }}
                  >
                    <Stack spacing={1.5}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                        <TextField
                          label={t('minutes.form.participantName')}
                          value={participant.name}
                          onChange={(e) =>
                            updateParticipant(participant.key, { name: e.target.value })
                          }
                          error={Boolean(fieldErrors[`${prefix}.name`])}
                          helperText={fieldError(`${prefix}.name`)}
                          variant="filled"
                          size="small"
                          required
                          fullWidth
                        />
                        <TextField
                          label={t('minutes.form.participantRole')}
                          value={participant.role_label}
                          onChange={(e) =>
                            updateParticipant(participant.key, { role_label: e.target.value })
                          }
                          error={Boolean(fieldErrors[`${prefix}.role_label`])}
                          helperText={fieldError(`${prefix}.role_label`)}
                          variant="filled"
                          size="small"
                          fullWidth
                        />
                        <IconButton
                          aria-label={t('minutes.form.removeParticipant', { index: index + 1 })}
                          onClick={() =>
                            touch((rows) => rows.filter((row) => row.key !== participant.key))
                          }
                          sx={{ alignSelf: { sm: 'center' } }}
                        >
                          <IconifyIcon icon="mingcute:delete-2-line" />
                        </IconButton>
                      </Stack>
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1.5}
                        alignItems="flex-start"
                      >
                        <TextField
                          label={t('minutes.form.participantEmail')}
                          type="email"
                          value={participant.email}
                          onChange={(e) =>
                            updateParticipant(participant.key, { email: e.target.value })
                          }
                          error={Boolean(fieldErrors[`${prefix}.email`])}
                          helperText={fieldError(`${prefix}.email`)}
                          variant="filled"
                          size="small"
                          fullWidth
                        />
                        <TextField
                          label={t('minutes.form.participantCpf')}
                          value={participant.cpf}
                          onChange={(e) =>
                            updateParticipant(participant.key, { cpf: formatCpf(e.target.value) })
                          }
                          error={Boolean(fieldErrors[`${prefix}.cpf`])}
                          helperText={
                            fieldError(`${prefix}.cpf`) ??
                            (participant.maskedCpf && !participant.cpf
                              ? t('minutes.form.cpfOnFile', { masked: participant.maskedCpf })
                              : undefined)
                          }
                          variant="filled"
                          size="small"
                          fullWidth
                          slotProps={{ htmlInput: { inputMode: 'numeric' } }}
                        />
                        <FormControlLabel
                          sx={{ flexShrink: 0, mt: 0.5 }}
                          control={
                            <Checkbox
                              checked={participant.signs}
                              onChange={(e) =>
                                updateParticipant(participant.key, { signs: e.target.checked })
                              }
                            />
                          }
                          label={t('minutes.form.participantSigns')}
                        />
                      </Stack>
                      {fieldErrors[`${prefix}.base`] && (
                        <Typography variant="caption" color="error">
                          {fieldErrors[`${prefix}.base`]}
                        </Typography>
                      )}
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="inherit" disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={14} /> : undefined}
          >
            {t('minutes.form.saveDraft')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default MinutesEntryFormDialog;
