import { useCallback, useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { SemanticChip } from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { listStudents } from 'services/studentsApi';
import { Guardian } from 'types/guardian';
import { Student } from 'types/student';
import { formatCpf } from 'utils/documentNumber';

export interface GuardianDetailsDialogProps {
  open: boolean;
  guardian: Guardian;
  onClose: () => void;
}

/** One labelled fact. Renders the dash placeholder itself so every caller reads the same. */
const Field = ({ label, value }: { label: string; value: string | null }) => (
  <Grid size={{ xs: 12, sm: 6 }}>
    <Typography variant="caption" color="text.secondary" component="div">
      {label}
    </Typography>
    <Typography variant="body2" color={value ? 'text.primary' : 'text.secondary'}>
      {value || '—'}
    </Typography>
  </Grid>
);

/**
 * Everything on file about one guardian.
 *
 * The listing carries only what tells two people apart at a glance — a name, a CPF, a phone. The
 * address and the contact details live here, where there is room to label them.
 */
const GuardianDetailsDialog = ({ open, guardian, onClose }: GuardianDetailsDialogProps) => {
  const { t } = useTranslation();

  const [children, setChildren] = useState<Student[]>([]);
  const [childrenLoading, setChildrenLoading] = useState(false);
  const [childrenError, setChildrenError] = useState(false);

  const street = [guardian.street, guardian.number, guardian.complement].filter(Boolean).join(', ');
  const city = [guardian.city, guardian.state].filter(Boolean).join('/');

  // The children are not on the guardian record — the link lives on the student — so they are
  // fetched when the dialog opens rather than carried by every row of the listing behind it.
  // `all`, because a child taken off the roll is still who this person answers for, and a
  // details view that quietly dropped them would read as the link having been lost.
  const loadChildren = useCallback(async () => {
    setChildrenLoading(true);
    setChildrenError(false);

    try {
      const response = await listStudents({
        schoolId: guardian.school_id,
        guardianId: guardian.id,
        status: 'all',
      });
      setChildren(response.data);
    } catch {
      setChildren([]);
      setChildrenError(true);
    } finally {
      setChildrenLoading(false);
    }
  }, [guardian.school_id, guardian.id]);

  useEffect(() => {
    if (!open) {
      return;
    }

    loadChildren();
  }, [open, loadChildren]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" gap={1.5} alignItems="center" flexWrap="wrap">
          {guardian.name}
          {/* Whether they can be billed and contacted at all is the first thing to know. */}
          <SemanticChip
            variant={guardian.active ? 'success' : 'info'}
            label={guardian.active ? t('common.activeStatus') : t('common.inactives')}
          />
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={2.5}>
          <Field label={t('common.name')} value={guardian.name} />
          <Field label="CPF" value={formatCpf(guardian.cpf) || null} />
          <Field label={t('common.email')} value={guardian.email || null} />
          <Field label={t('common.phone')} value={guardian.phone || null} />

          <Grid size={12}>
            <Divider />
          </Grid>

          <Grid size={12}>
            <Typography variant="caption" color="text.secondary" component="div">
              {t('guardians.details.address')}
            </Typography>
          </Grid>

          <Field label={t('guardians.details.zipCode')} value={guardian.zip_code} />
          <Field label={t('guardians.details.street')} value={street || null} />
          <Field label={t('guardians.details.neighborhood')} value={guardian.neighborhood} />
          <Field label={t('common.city')} value={city || null} />

          <Grid size={12}>
            <Divider />
          </Grid>

          <Grid size={12}>
            <Typography variant="caption" color="text.secondary" component="div">
              {t('guardians.details.children')}
            </Typography>
          </Grid>

          <Grid size={12}>
            {childrenLoading ? (
              <CircularProgress size={20} />
            ) : childrenError ? (
              <Typography variant="body2" color="text.secondary">
                {t('guardians.details.childrenError')}
              </Typography>
            ) : children.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {t('guardians.details.noChildren')}
              </Typography>
            ) : (
              <Stack direction="column" gap={1}>
                {children.map((child) => (
                  <Stack
                    key={child.id}
                    direction="row"
                    gap={1.5}
                    alignItems="center"
                    flexWrap="wrap"
                  >
                    <Typography variant="body2">{child.name}</Typography>
                    {/* Which class they are in is how a secretary tells two children apart. */}
                    <Typography variant="body2" color="text.secondary">
                      {child.school_class_name ?? t('guardians.details.noClass')}
                    </Typography>
                    {!child.active && <SemanticChip variant="info" label={t('common.inactives')} />}
                  </Stack>
                ))}
              </Stack>
            )}
          </Grid>

          <Grid size={12}>
            <Divider />
          </Grid>

          {/* Whether this person can sign in. A guardian is a register entry until an account is
              provisioned for them, which is what "Enviar acesso" does. */}
          <Field
            label={t('guardians.details.systemAccess')}
            value={
              guardian.user_id
                ? t('guardians.details.hasAccount')
                : t('guardians.details.noAccount')
            }
          />
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained">
          {t('common.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GuardianDetailsDialog;
