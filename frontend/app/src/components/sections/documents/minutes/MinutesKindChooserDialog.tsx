import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import { useTranslation } from 'providers/I18nContext';
import { MINUTES_KINDS, MinutesKind } from 'types/minutes';

export interface MinutesKindChooserDialogProps {
  open: boolean;
  onClose: () => void;
  onChoose: (kind: MinutesKind) => void;
}

/** "Nova ata" — the three kinds of BR-LA02; the one picked here is fixed for the entry's life. */
const MinutesKindChooserDialog = ({ open, onClose, onChoose }: MinutesKindChooserDialogProps) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('minutes.chooser.title')}</DialogTitle>
      <DialogContent>
        <DialogContentText>{t('minutes.chooser.description')}</DialogContentText>
        <List>
          {MINUTES_KINDS.map((kind) => (
            <ListItemButton key={kind} onClick={() => onChoose(kind)}>
              <ListItemText primary={t(`minutes.kind.${kind}`)} />
            </ListItemButton>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          {t('common.cancel')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MinutesKindChooserDialog;
