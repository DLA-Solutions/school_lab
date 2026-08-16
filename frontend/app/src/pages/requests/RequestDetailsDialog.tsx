import { useState } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'providers/I18nContext';
import { RequestAction } from 'services/requestsApi';
import { GuardianRequest } from 'types/guardianRequest';

export interface RequestDetailsDialogProps {
  open: boolean;
  request: GuardianRequest;
  onClose: () => void;
  onAct: (action: RequestAction, resolutionNote?: string) => void;
}

/** ISO (`2026-05-12`) → `12/05/2026`, split rather than parsed to avoid a timezone round trip. */
const formatDate = (value: string | null) => {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split('-');

  return `${day}/${month}/${year}`;
};

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
 * One request, and what the school can do about it.
 *
 * The answer box is always on show rather than appearing once "recusar" is pressed: whoever is
 * about to refuse a family needs to be writing the reason as they decide, not after.
 */
const RequestDetailsDialog = ({ open, request, onClose, onAct }: RequestDetailsDialogProps) => {
  const { t } = useTranslation();
  const [note, setNote] = useState('');

  const answered = request.status === 'fulfilled' || request.status === 'rejected';
  const trimmedNote = note.trim();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t(`requests.kind.${request.kind}`)}</DialogTitle>

      <DialogContent>
        <Grid container spacing={2}>
          <Field label={t('common.student')} value={request.student_name} />
          <Field label={t('requests.column.guardian')} value={request.guardian_name} />
          <Field
            label={t('requests.column.status')}
            value={t(`requests.status.${request.status}`)}
          />
          <Field
            label={t('requests.column.openedOn')}
            value={new Date(request.created_at).toLocaleDateString()}
          />
          {request.kind === 'second_call' && (
            <>
              <Field label={t('common.subject')} value={request.subject_name} />
              <Field
                label={t('requests.field.referenceDate')}
                value={formatDate(request.reference_date)}
              />
            </>
          )}
        </Grid>

        <Divider sx={{ my: 2.5 }} />

        <Typography variant="caption" color="text.secondary" component="div">
          {t('requests.field.details')}
        </Typography>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
          {request.details}
        </Typography>

        {answered ? (
          <>
            <Divider sx={{ my: 2.5 }} />
            <Typography variant="caption" color="text.secondary" component="div">
              {t('requests.field.resolution')}
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {request.resolution_note || '—'}
            </Typography>
          </>
        ) : (
          <TextField
            id="request-resolution-note"
            label={t('requests.field.resolution')}
            helperText={t('requests.field.resolutionHelp')}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            variant="filled"
            size="small"
            multiline
            minRows={3}
            fullWidth
            sx={{ mt: 2.5 }}
          />
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>{t('common.close')}</Button>

        {request.status === 'pending' && (
          <Button onClick={() => onAct('start')}>{t('requests.action.start')}</Button>
        )}
        {request.status === 'in_progress' && (
          <Button onClick={() => onAct('release')}>{t('requests.action.release')}</Button>
        )}

        {!answered && (
          <Stack direction="row" gap={1}>
            <Button
              color="error"
              // A refusal with no reason is refused by the API, and disabling the button says so
              // before the click rather than after it.
              disabled={!trimmedNote}
              onClick={() => onAct('reject', trimmedNote)}
            >
              {t('requests.action.reject')}
            </Button>
            <Button
              variant="contained"
              onClick={() => onAct('fulfill', trimmedNote || undefined)}
            >
              {t('requests.action.fulfill')}
            </Button>
          </Stack>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default RequestDetailsDialog;
