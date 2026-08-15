import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'providers/I18nContext';
import { Teacher } from 'types/academics';
import { formatCpf } from 'utils/documentNumber';
import { schoolClassLabel } from 'utils/schoolClassLabel';

export interface CollaboratorDetailsDialogProps {
  open: boolean;
  teacher: Teacher;
  onClose: () => void;
}

/** ISO (`2024-02-01`) → `01/02/2024`, split rather than parsed to avoid a timezone round trip. */
const formatDate = (value: string | null) => {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split('-');

  return `${day}/${month}/${year}`;
};

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
 * Everything on file about one collaborator.
 *
 * The listing carries only what tells two people apart at a glance; the contact details and the
 * hiring date live here, where there is room to label them.
 */
const CollaboratorDetailsDialog = ({
  open,
  teacher,
  onClose,
}: CollaboratorDetailsDialogProps) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="column" gap={0.25}>
          {teacher.name}
          <Typography variant="body2" color="text.secondary">
            {teacher.job_title ?? t('collaborators.noPosition')}
          </Typography>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2.5}>
          <Field label={t('common.name')} value={teacher.name} />
          <Field label={t('common.position')} value={teacher.job_title} />
          <Field label="CPF" value={formatCpf(teacher.cpf) || null} />
          <Field label={t('collaborators.hiredOn')} value={formatDate(teacher.hired_on)} />
          <Field label={t('common.email')} value={teacher.email || null} />
          <Field label={t('common.phone')} value={teacher.phone} />

          <Grid size={12}>
            <Divider />
          </Grid>

          <Grid size={12}>
            <Typography variant="caption" color="text.secondary" component="div" mb={1}>
              {t('collaborators.classesColumn')}
            </Typography>

            {teacher.classes.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {t('common.noClasses')}
              </Typography>
            ) : (
              <Stack direction="column" gap={1.5}>
                {teacher.classes.map((schoolClass) => (
                  <Stack key={schoolClass.id} direction="column" gap={0.75}>
                    <Typography variant="body2">{schoolClassLabel(schoolClass, t)}</Typography>
                    <Stack direction="row" gap={0.75} flexWrap="wrap">
                      {schoolClass.subjects.map((subject) => (
                        <Chip key={subject.id} size="small" variant="outlined" label={subject.name} />
                      ))}
                    </Stack>
                  </Stack>
                ))}
              </Stack>
            )}
          </Grid>
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

export default CollaboratorDetailsDialog;
