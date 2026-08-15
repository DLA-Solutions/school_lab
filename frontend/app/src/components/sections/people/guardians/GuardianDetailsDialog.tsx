import Button from '@mui/material/Button';
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
import { Guardian } from 'types/guardian';
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

  const street = [guardian.street, guardian.number, guardian.complement]
    .filter(Boolean)
    .join(', ');
  const city = [guardian.city, guardian.state].filter(Boolean).join('/');

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
