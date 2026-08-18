import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ErrorBanner } from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { getTeacherBankAccount, updateTeacherBankAccount } from 'services/academicsApi';
import { ApiError } from 'services/api';
import { Teacher, TeacherBankAccount } from 'types/academics';

export interface CollaboratorBankAccountDialogProps {
  open: boolean;
  schoolId: number;
  teacher: Teacher;
  onClose: () => void;
  onSaved?: (account: TeacherBankAccount) => void;
}

type FormField = 'pix_key' | 'bank_name' | 'agency' | 'account_number';

type FormState = Record<FormField, string>;

type FieldErrors = Partial<Record<FormField, string>>;

const emptyForm: FormState = { pix_key: '', bank_name: '', agency: '', account_number: '' };

const toFormState = (account: TeacherBankAccount): FormState => ({
  pix_key: account.pix_key ?? '',
  bank_name: account.bank_name ?? '',
  agency: account.agency ?? '',
  account_number: account.account_number ?? '',
});

const trimmed = (value: string) => value.trim() || null;

/**
 * Where a collaborator's salary is sent.
 *
 * A pix key is the short road — no bank, no branch, no account. The account details are the
 * longer one, and half of them is not a route to anywhere, so the form asks for all three
 * together or none of them. The bank is a plain text box: a code list decided here goes stale
 * every time two banks merge, and what the payer needs is the name they will recognise on the
 * transfer screen.
 */
const CollaboratorBankAccountDialog = ({
  open,
  schoolId,
  teacher,
  onClose,
  onSaved,
}: CollaboratorBankAccountDialogProps) => {
  const { t, locale } = useTranslation();

  const [form, setForm] = useState<FormState>(emptyForm);
  const [account, setAccount] = useState<TeacherBankAccount | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await getTeacherBankAccount(schoolId, teacher.id);
        if (!cancelled) {
          setAccount(data);
          setForm(toFormState(data));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : t('bankAccount.loadError'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [open, schoolId, teacher.id, t]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const field = e.target.name as FormField;
    const { value } = e.target;

    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setError('');
  };

  // The same rules the record enforces, checked here so the school is told before a round trip.
  const validate = (state: FormState): FieldErrors => {
    const errors: FieldErrors = {};
    const hasAccount = Boolean(state.agency.trim() || state.account_number.trim());

    if (!state.pix_key.trim() && !hasAccount) {
      errors.pix_key = t('bankAccount.error.noRoute');
      return errors;
    }

    if (hasAccount) {
      if (!state.bank_name.trim()) {
        errors.bank_name = t('bankAccount.error.bankRequired');
      }
      if (!state.agency.trim()) {
        errors.agency = t('bankAccount.error.agencyRequired');
      }
      if (!state.account_number.trim()) {
        errors.account_number = t('bankAccount.error.accountRequired');
      }
    }

    return errors;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const localErrors = validate(form);
    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors);
      return;
    }

    setSaving(true);
    setError('');

    try {
      const saved = await updateTeacherBankAccount(schoolId, teacher.id, {
        pix_key: trimmed(form.pix_key),
        bank_name: trimmed(form.bank_name),
        agency: trimmed(form.agency),
        account_number: trimmed(form.account_number),
      });

      setAccount(saved);
      onSaved?.(saved);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('bankAccount.saveError'));
      setSaving(false);
    }
  };

  const fieldProps = (field: FormField) => ({
    id: `bank-account-${field}`,
    name: field,
    value: form[field],
    onChange: handleChange,
    error: Boolean(fieldErrors[field]),
    helperText: fieldErrors[field],
    disabled: saving || loading,
    fullWidth: true,
  });

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {t('bankAccount.title')}
        <Typography variant="body2" color="text.secondary">
          {teacher.name}
        </Typography>
      </DialogTitle>

      <Stack component="form" onSubmit={handleSubmit} direction="column" noValidate>
        <DialogContent dividers>
          {loading ? (
            <Stack alignItems="center" py={5}>
              <CircularProgress size={28} />
            </Stack>
          ) : (
            <Grid container spacing={2.5} pt={0.5}>
              <Grid size={12}>
                <Typography variant="body2" color="text.secondary">
                  {t('bankAccount.description')}
                </Typography>
              </Grid>

              <Grid size={12}>
                <TextField
                  {...fieldProps('pix_key')}
                  label={t('bankAccount.pixKey')}
                  placeholder={t('bankAccount.pixPlaceholder')}
                  autoFocus
                />
              </Grid>

              <Grid size={12}>
                <Divider>
                  <Typography variant="caption" color="text.secondary">
                    {t('bankAccount.orAccount')}
                  </Typography>
                </Divider>
              </Grid>

              <Grid size={12}>
                {/* Free text on purpose: a code list goes stale every time two banks merge. */}
                <TextField
                  {...fieldProps('bank_name')}
                  label={t('bankAccount.bank')}
                  placeholder={t('bankAccount.bankPlaceholder')}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 5 }}>
                <TextField {...fieldProps('agency')} label={t('bankAccount.agency')} />
              </Grid>
              <Grid size={{ xs: 12, sm: 7 }}>
                <TextField
                  {...fieldProps('account_number')}
                  label={t('bankAccount.accountNumber')}
                />
              </Grid>

              {/* Money leaves on the strength of this record, so it says who last wrote it. */}
              {account?.filled && account.updated_by_name && (
                <Grid size={12}>
                  <Typography variant="caption" color="text.secondary">
                    {t('bankAccount.lastUpdatedBy', {
                      name: account.updated_by_name,
                      date: account.updated_at
                        ? new Date(account.updated_at).toLocaleDateString(locale)
                        : '',
                    })}
                  </Typography>
                </Grid>
              )}

              {error && (
                <Grid size={12}>
                  <ErrorBanner message={error} />
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="contained" disabled={saving || loading}>
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        </DialogActions>
      </Stack>
    </Dialog>
  );
};

export default CollaboratorBankAccountDialog;
