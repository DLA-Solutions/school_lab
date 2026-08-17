import { FormEvent, useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { ConfirmDialog, EmptyState, ErrorBanner } from 'design-system';
import IconifyIcon from 'components/base/IconifyIcon';
import { useTranslation } from 'providers/I18nContext';
import { ApiError } from 'services/api';
import {
  AuthorizedPickup,
  createAuthorizedPickup,
  deleteAuthorizedPickup,
  listAuthorizedPickups,
  pickupPhotoUrl,
} from 'services/authorizedPickupsApi';
import { formatCpf } from 'utils/documentNumber';

export interface AuthorizedPickupsDialogProps {
  open: boolean;
  schoolId: number;
  studentId: number;
  studentName: string;
  /** The family's side: reads through the portal and may add or withdraw somebody. */
  asGuardian?: boolean;
  onClose: () => void;
}

/**
 * Who may collect a child at the gate.
 *
 * The same dialog serves both sides. The family names people and withdraws them; the school only
 * reads — a staff member who could add a name here would be letting a stranger through with the
 * record saying it was allowed all along, so the form is theirs alone.
 *
 * The photo is the point as much as the name: whoever is at the door has to be recognised by
 * somebody who has never met them.
 */
const AuthorizedPickupsDialog = ({
  open,
  schoolId,
  studentId,
  studentName,
  asGuardian = false,
  onClose,
}: AuthorizedPickupsDialogProps) => {
  const { t } = useTranslation();

  const [pickups, setPickups] = useState<AuthorizedPickup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [previewing, setPreviewing] = useState<AuthorizedPickup | null>(null);
  const [removing, setRemoving] = useState<AuthorizedPickup | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      setPickups(await listAuthorizedPickups(schoolId, studentId, { asGuardian }));
    } catch (err) {
      setPickups([]);
      setError(err instanceof ApiError ? err.message : t('pickups.loadError'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, studentId, asGuardian, t]);

  useEffect(() => {
    if (!open) {
      return;
    }

    load();
  }, [open, load]);

  const resetForm = () => {
    setName('');
    setCpf('');
    setPhone('');
    setPhoto(null);
  };

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault();

    if (!name.trim()) {
      setFormError(t('pickups.nameRequired'));
      return;
    }
    if (!cpf.trim()) {
      setFormError(t('pickups.cpfRequired'));
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      await createAuthorizedPickup(schoolId, studentId, {
        name: name.trim(),
        cpf: cpf.trim(),
        phone: phone.trim() || undefined,
        photo,
      });
      resetForm();
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : t('pickups.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!removing) {
      return;
    }

    const target = removing;
    setRemoving(null);
    setError('');

    try {
      await deleteAuthorizedPickup(schoolId, studentId, target.id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('pickups.removeError'));
    }
  };

  return (
    <>
      <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {t('pickups.title')}
          <Typography variant="body2" color="text.secondary">
            {studentName}
          </Typography>
        </DialogTitle>

        <DialogContent dividers>
          <Stack direction="column" gap={2.5}>
            <Typography variant="body2" color="text.secondary">
              {t('pickups.description')}
            </Typography>

            {error && (
              <ErrorBanner message={error} onRetry={load} retryLabel={t('common.tryAgain')} />
            )}

            {loading ? (
              <Stack alignItems="center" py={5}>
                <CircularProgress size={28} />
              </Stack>
            ) : pickups.length === 0 ? (
              <EmptyState
                title={t('pickups.empty.title')}
                description={asGuardian ? t('pickups.empty.guardian') : t('pickups.empty.school')}
                headingLevel={2}
              />
            ) : (
              <Stack direction="column" gap={1.5}>
                {pickups.map((pickup) => (
                  <Stack
                    key={pickup.id}
                    direction="row"
                    gap={1.5}
                    alignItems="center"
                    flexWrap="wrap"
                  >
                    <Stack direction="column" flex={1} minWidth={180}>
                      <Typography variant="body2">{pickup.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatCpf(pickup.cpf)}
                        {pickup.phone ? ` — ${pickup.phone}` : ''}
                      </Typography>
                    </Stack>

                    {/* The face is what staff at the gate actually check, so it is offered
                        wherever the list is read. */}
                    {pickup.has_photo ? (
                      <Button size="small" onClick={() => setPreviewing(pickup)}>
                        {t('pickups.viewPhoto')}
                      </Button>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        {t('pickups.noPhoto')}
                      </Typography>
                    )}

                    {asGuardian && (
                      <Tooltip title={t('pickups.remove')}>
                        <IconButton
                          size="small"
                          aria-label={t('pickups.removeAria', { name: pickup.name })}
                          onClick={() => setRemoving(pickup)}
                        >
                          <IconifyIcon icon="mingcute:delete-2-line" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                ))}
              </Stack>
            )}

            {/* The family authorises; the school reads. No form on the school's side. */}
            {asGuardian && (
              <>
                <Divider />

                <Stack component="form" onSubmit={handleAdd} direction="column" gap={2} noValidate>
                  <Typography variant="body2" color="text.secondary">
                    {t('pickups.addTitle')}
                  </Typography>

                  {formError && <ErrorBanner message={formError} />}

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        id="pickup-name"
                        label={t('common.name')}
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        fullWidth
                        required
                        disabled={saving}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        id="pickup-cpf"
                        label="CPF"
                        value={cpf}
                        onChange={(event) => setCpf(event.target.value)}
                        fullWidth
                        required
                        disabled={saving}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        id="pickup-phone"
                        label={t('common.phone')}
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        fullWidth
                        disabled={saving}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Button
                        component="label"
                        variant="outlined"
                        fullWidth
                        sx={{ height: 1, minHeight: 56 }}
                        disabled={saving}
                        startIcon={<IconifyIcon icon="mingcute:pic-line" />}
                      >
                        {photo ? photo.name : t('pickups.choosePhoto')}
                        <input
                          hidden
                          type="file"
                          accept="image/*"
                          aria-label={t('pickups.choosePhoto')}
                          onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
                        />
                      </Button>
                    </Grid>
                  </Grid>

                  <Stack direction="row" justifyContent="flex-end">
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={saving}
                      startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
                    >
                      {saving ? t('common.saving') : t('pickups.add')}
                    </Button>
                  </Stack>
                </Stack>
              </>
            )}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} variant="contained" disabled={saving}>
            {t('common.close')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Shown on demand rather than as thumbnails down the list: it is a face to be looked at
          properly at the gate, and a row of tiny crops helps nobody recognise anyone. */}
      <Dialog
        open={previewing !== null}
        onClose={() => setPreviewing(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {previewing?.name}
          <Typography variant="body2" color="text.secondary">
            {previewing ? formatCpf(previewing.cpf) : ''}
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          {previewing && (
            <Box
              component="img"
              src={pickupPhotoUrl(previewing) ?? ''}
              alt={t('pickups.photoAlt', { name: previewing.name })}
              sx={{ width: 1, borderRadius: 1, display: 'block' }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewing(null)} variant="contained">
            {t('common.close')}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={removing !== null}
        title={t('pickups.removeTitle')}
        message={removing ? t('pickups.removeMessage', { name: removing.name }) : ''}
        destructive
        confirmLabel={t('pickups.remove')}
        cancelLabel={t('common.cancel')}
        onConfirm={handleRemove}
        onCancel={() => setRemoving(null)}
      />
    </>
  );
};

export default AuthorizedPickupsDialog;
