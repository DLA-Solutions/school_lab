import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TeacherHealthProfileSection from 'components/sections/academics/TeacherHealthProfileSection';
import { useTranslation } from 'providers/I18nContext';
import { Teacher } from 'types/academics';

export interface CollaboratorHealthProfileDialogProps {
  open: boolean;
  schoolId: number;
  teacher: Teacher;
  onClose: () => void;
}

/**
 * Staff-facing, read-only view of a collaborator's health profile (BC6 — UC-CH02).
 *
 * Opened from the Colaboradores roster by staff with `manage_people`; there is no write path
 * here at all — only the teacher named on the row may fill this in, via their own "Minha ficha
 * de saúde" page.
 */
const CollaboratorHealthProfileDialog = ({
  open,
  schoolId,
  teacher,
  onClose,
}: CollaboratorHealthProfileDialogProps) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {t('health.title')}
        <Typography variant="body2" color="text.secondary">
          {teacher.name}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        <Stack direction="column" gap={3}>
          <Typography variant="body2" color="text.secondary">
            {t('health.teacherProfile.descriptionStaff')}
          </Typography>

          <TeacherHealthProfileSection schoolId={schoolId} teacherId={teacher.id} readOnly />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained">
          {t('common.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CollaboratorHealthProfileDialog;
