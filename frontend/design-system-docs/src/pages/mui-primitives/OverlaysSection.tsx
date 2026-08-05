import { useState, MouseEvent } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import IconifyIcon from 'components/base/IconifyIcon';
import LivePreview from '../../components/LivePreview';

const OverlaysSection = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);

  const handleMenuOpen = (event: MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  return (
    <>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Tooltip — subtle dark surface, readable at small sizes.
      </Typography>
      <LivePreview>
        <Stack direction="row" spacing={2}>
          <Tooltip title="Switch to dark mode">
            <IconButton size="large">
              <IconifyIcon icon="mdi:weather-night" />
            </IconButton>
          </Tooltip>
          <Tooltip title="This action cannot be undone" arrow placement="top">
            <Button variant="outlined">Hover me</Button>
          </Tooltip>
        </Stack>
      </LivePreview>

      <Typography variant="subtitle2" color="text.secondary" gutterBottom mt={3}>
        Menu — paper surface aligned with the Paper menu override (used by ProfileMenu, LanguageSelect).
      </Typography>
      <LivePreview>
        <Button variant="outlined" onClick={handleMenuOpen}>
          Open menu
        </Button>
        <Menu anchorEl={anchorEl} open={menuOpen} onClose={handleMenuClose} onClick={handleMenuClose}>
          <MenuItem>
            <ListItemIcon>
              <IconifyIcon icon="mdi:account-outline" />
            </ListItemIcon>
            <ListItemText>Profile</ListItemText>
          </MenuItem>
          <MenuItem>
            <ListItemIcon>
              <IconifyIcon icon="mdi:cog-outline" />
            </ListItemIcon>
            <ListItemText>Settings</ListItemText>
          </MenuItem>
          <MenuItem>
            <ListItemIcon>
              <IconifyIcon icon="mdi:logout" />
            </ListItemIcon>
            <ListItemText>Logout</ListItemText>
          </MenuItem>
        </Menu>
      </LivePreview>

      <Typography variant="subtitle2" color="text.secondary" gutterBottom mt={3}>
        Dialog — brand-consistent paper, spacing, and typography (also used by the ConfirmDialog pattern).
      </Typography>
      <LivePreview>
        <Button variant="contained" onClick={() => setDialogOpen(true)}>
          Open dialog
        </Button>
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Delete order?</DialogTitle>
          <DialogContent>
            <DialogContentText>This action cannot be undone.</DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)} color="inherit">
              Cancel
            </Button>
            <Button onClick={() => setDialogOpen(false)} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </LivePreview>

      <Typography variant="subtitle2" color="text.secondary" gutterBottom mt={3}>
        Snackbar — the Alert-in-Snackbar pattern for status messages. Placement and timing come
        from the theme; see Primitives → Snackbar.
      </Typography>
      <LivePreview>
        <Button variant="outlined" onClick={() => setSnackbarOpen(true)}>
          Show toast
        </Button>
        <Snackbar open={snackbarOpen} onClose={() => setSnackbarOpen(false)}>
          <Alert severity="success" onClose={() => setSnackbarOpen(false)} sx={{ width: '100%' }}>
            Changes saved successfully.
          </Alert>
        </Snackbar>
      </LivePreview>
    </>
  );
};

export default OverlaysSection;
