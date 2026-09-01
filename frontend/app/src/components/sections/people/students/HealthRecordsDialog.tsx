import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import HealthProfileSection from 'components/sections/people/students/HealthProfileSection';
import HealthRecordsList from 'components/sections/people/students/HealthRecordsList';
import { useTranslation } from 'providers/I18nContext';

export interface HealthRecordsDialogProps {
  open: boolean;
  schoolId: number;
  studentId: number;
  studentName: string;
  asGuardian?: boolean;
  readOnly?: boolean;
  onClose: () => void;
}

/**
 * The full health sheet for one child — structured profile plus individual records.
 *
 * Staff open it from the register to read what the family reported; guardians manage the same
 * content inline on the portal page or could use this dialog when a compact view is needed.
 */
const HealthRecordsDialog = ({
  open,
  schoolId,
  studentId,
  studentName,
  asGuardian = false,
  readOnly = false,
  onClose,
}: HealthRecordsDialogProps) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {t('health.title')}
        <Typography variant="body2" color="text.secondary">
          {studentName}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        <Stack direction="column" gap={3}>
          <Typography variant="body2" color="text.secondary">
            {readOnly ? t('health.descriptionStaff') : t('health.description')}
          </Typography>

          <HealthProfileSection
            schoolId={schoolId}
            studentId={studentId}
            asGuardian={asGuardian}
            readOnly={readOnly}
          />

          <HealthRecordsList
            schoolId={schoolId}
            studentId={studentId}
            asGuardian={asGuardian}
            readOnly={readOnly}
          />
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

export default HealthRecordsDialog;
