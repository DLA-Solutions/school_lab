import { FormEvent, useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { ErrorBanner } from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { ApiError } from 'services/api';
import { createMinutesBook } from 'services/minutesApi';
import { MinutesBook } from 'types/minutes';
import { flattenErrorDetails, minutesErrorMessage } from 'utils/api/minutesErrors';

export interface MinutesBookDialogProps {
  open: boolean;
  schoolId: number;
  onClose: () => void;
  onCreated: (book: MinutesBook) => void;
}

/** UC-LA01 — a book is a name and a year; a repeated name + year comes back `422`, shown inline. */
const MinutesBookDialog = ({ open, schoolId, onClose, onCreated }: MinutesBookDialogProps) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [nameError, setNameError] = useState('');
  const [yearError, setYearError] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setName('');
    setYear(String(new Date().getFullYear()));
    setNameError('');
    setYearError('');
    setError('');
  }, [open]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    const trimmed = name.trim();
    const parsedYear = /^\d{4}$/.test(year.trim()) ? Number(year.trim()) : null;

    setNameError(trimmed ? '' : t('minutes.bookForm.nameRequired'));
    setYearError(parsedYear ? '' : t('minutes.bookForm.yearInvalid'));
    setError('');

    if (!trimmed || !parsedYear) {
      return;
    }

    setSaving(true);

    try {
      onCreated(await createMinutesBook(schoolId, { name: trimmed, year: parsedYear }));
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        const details = flattenErrorDetails(err.details);
        setNameError(details.name ?? '');
        setYearError(details.year ?? '');
        setError(
          details.base ??
            (details.name || details.year
              ? ''
              : minutesErrorMessage(err, t, 'minutes.bookForm.saveError')),
        );
      } else {
        setError(minutesErrorMessage(err, t, 'minutes.bookForm.saveError'));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="xs" fullWidth>
      <form onSubmit={submit} noValidate>
        <DialogTitle>{t('minutes.bookForm.title')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} pt={1}>
            {error && <ErrorBanner message={error} />}
            <TextField
              id="minutes-book-name"
              label={t('minutes.bookForm.name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={Boolean(nameError)}
              helperText={nameError || undefined}
              variant="filled"
              size="small"
              autoFocus
              required
              fullWidth
            />
            <TextField
              id="minutes-book-year"
              label={t('minutes.bookForm.year')}
              value={year}
              onChange={(e) => setYear(e.target.value)}
              error={Boolean(yearError)}
              helperText={yearError || undefined}
              variant="filled"
              size="small"
              required
              fullWidth
              slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 4 } }}
            />
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
            {t('common.save')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default MinutesBookDialog;
