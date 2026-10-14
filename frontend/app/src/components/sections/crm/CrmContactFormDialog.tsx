import { FormEvent, useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { ErrorBanner } from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { ApiError } from 'services/api';
import { createCrmContact, updateCrmContact } from 'services/crmApi';
import { CRM_TEMPERATURES, CrmContact, CrmContactDetail, CrmTemperature } from 'types/crm';

export interface CrmContactFormDialogProps {
  open: boolean;
  schoolId: number;
  /** When set, the dialog edits this contact; otherwise it creates one. */
  contact?: CrmContact | null;
  onClose: () => void;
  onSaved: (contact: CrmContactDetail) => void;
}

type FormField = 'name' | 'phone' | 'email' | 'notes' | 'temperature';

interface FormValues {
  name: string;
  phone: string;
  email: string;
  notes: string;
  temperature: CrmTemperature;
}

const FIELDS: readonly FormField[] = ['name', 'phone', 'email', 'notes', 'temperature'];

const valuesFor = (contact?: CrmContact | null): FormValues => ({
  name: contact?.name ?? '',
  phone: contact?.phone ?? '',
  email: contact?.email ?? '',
  notes: contact?.notes ?? '',
  temperature: contact?.temperature ?? 'cold',
});

/**
 * Create / edit form for one CRM contact. Validation here is UX-only (name present); the API owns
 * the real rules and its 422 `details` are shown under the field they name.
 */
const CrmContactFormDialog = ({
  open,
  schoolId,
  contact,
  onClose,
  onSaved,
}: CrmContactFormDialogProps) => {
  const { t } = useTranslation();
  const [values, setValues] = useState<FormValues>(valuesFor(contact));
  const [errors, setErrors] = useState<Partial<Record<FormField, string>>>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Reset whenever the dialog is (re)opened, so a cancelled edit never leaks into the next one.
  useEffect(() => {
    if (open) {
      setValues(valuesFor(contact));
      setErrors({});
      setFormError('');
    }
  }, [open, contact]);

  const setField = <K extends FormField>(field: K, value: FormValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!values.name.trim()) {
      setErrors({ name: t('crm.form.nameRequired') });
      return;
    }

    setSaving(true);
    setFormError('');

    const payload = {
      name: values.name.trim(),
      phone: values.phone.trim() || null,
      email: values.email.trim() || null,
      notes: values.notes.trim() || null,
      temperature: values.temperature,
    };

    try {
      const saved = contact
        ? await updateCrmContact(schoolId, contact.id, payload)
        : await createCrmContact(schoolId, payload);

      onSaved(saved);
    } catch (err) {
      if (err instanceof ApiError) {
        const fieldErrors: Partial<Record<FormField, string>> = {};
        for (const field of FIELDS) {
          const detail = err.details[field];
          if (Array.isArray(detail) && typeof detail[0] === 'string') {
            fieldErrors[field] = detail[0];
          }
        }

        if (Object.keys(fieldErrors).length > 0) {
          setErrors(fieldErrors);
        } else {
          setFormError(err.message);
        }
      } else {
        setFormError(t('common.saveConnectionError'));
      }
    } finally {
      setSaving(false);
    }
  };

  const fieldProps = (field: FormField) => ({
    id: `crm-contact-${field}`,
    name: field,
    value: values[field],
    onChange: (event: { target: { value: string } }) =>
      setField(field, event.target.value as FormValues[typeof field]),
    error: Boolean(errors[field]),
    helperText: errors[field],
    disabled: saving,
    variant: 'filled' as const,
    fullWidth: true,
  });

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{contact ? t('crm.edit') : t('crm.new')}</DialogTitle>
      <Stack component="form" onSubmit={handleSubmit} direction="column" noValidate>
        <DialogContent>
          <Stack direction="column" gap={2}>
            {formError && <ErrorBanner message={formError} />}
            <TextField
              {...fieldProps('name')}
              label={t('crm.form.nameLabel')}
              autoFocus
              required
            />
            <TextField {...fieldProps('phone')} label={t('crm.form.phoneLabel')} type="tel" />
            <TextField {...fieldProps('email')} label={t('crm.form.emailLabel')} type="email" />
            <TextField
              {...fieldProps('temperature')}
              label={t('crm.form.temperatureLabel')}
              select
            >
              {CRM_TEMPERATURES.map((temperature) => (
                <MenuItem key={temperature} value={temperature}>
                  {t(`crm.temperature.${temperature}`)}
                </MenuItem>
              ))}
            </TextField>
            <TextField {...fieldProps('notes')} label={t('crm.form.notesLabel')} multiline minRows={3} />
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
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        </DialogActions>
      </Stack>
    </Dialog>
  );
};

export default CrmContactFormDialog;
