import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import Skeleton from '@mui/material/Skeleton';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import IconifyIcon from 'components/base/IconifyIcon';
import LivePreview from '../../components/LivePreview';

const DataDisplaySection = () => (
  <>
    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
      Avatar — brand-colored initials/icon fallback for profile menus.
    </Typography>
    <LivePreview>
      <Stack direction="row" spacing={2}>
        <Avatar sx={{ bgcolor: 'primary.main' }}>DS</Avatar>
        <Avatar sx={{ bgcolor: 'secondary.main' }}>
          <IconifyIcon icon="mdi:account" />
        </Avatar>
        <Avatar>?</Avatar>
      </Stack>
    </LivePreview>

    <Typography variant="subtitle2" color="text.secondary" gutterBottom mt={3}>
      CircularProgress / LinearProgress — brand primary and secondary colors.
    </Typography>
    <LivePreview>
      <Stack spacing={2}>
        <Stack direction="row" spacing={3} alignItems="center">
          <CircularProgress />
          <CircularProgress color="secondary" />
          <CircularProgress size={16} color="inherit" />
        </Stack>
        <Box>
          <LinearProgress />
        </Box>
        <Box>
          <LinearProgress color="secondary" variant="determinate" value={60} />
        </Box>
      </Stack>
    </LivePreview>

    <Typography variant="subtitle2" color="text.secondary" gutterBottom mt={3}>
      Badge — unread counts and status dots, with a paper-colored ring for contrast.
    </Typography>
    <LivePreview>
      <Stack direction="row" spacing={4}>
        <Badge badgeContent={4} color="primary">
          <IconifyIcon icon="mdi:bell-outline" width={28} height={28} />
        </Badge>
        <Badge variant="dot" color="success">
          <Avatar sx={{ bgcolor: 'secondary.main' }}>
            <IconifyIcon icon="mdi:account" />
          </Avatar>
        </Badge>
        <Badge badgeContent={99} max={99} color="error">
          <IconifyIcon icon="mdi:email-outline" width={28} height={28} />
        </Badge>
      </Stack>
    </LivePreview>

    <Typography variant="subtitle2" color="text.secondary" gutterBottom mt={3}>
      Skeleton — loading placeholders that match the surface.alt token.
    </Typography>
    <LivePreview>
      <Stack direction="row" spacing={2} alignItems="center">
        <Skeleton variant="circular" width={40} height={40} />
        <Stack spacing={0.5} flex={1}>
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="40%" />
        </Stack>
      </Stack>
    </LivePreview>

    <Typography variant="subtitle2" color="text.secondary" gutterBottom mt={3}>
      ListItemButton — sidebar navigation style (used by the topbar drawer and docs nav).
    </Typography>
    <LivePreview>
      <List sx={{ maxWidth: 240 }}>
        <ListItemButton selected>
          <ListItemIcon>
            <IconifyIcon icon="mdi:view-dashboard-outline" />
          </ListItemIcon>
          <ListItemText primary="Dashboard" />
        </ListItemButton>
        <ListItemButton>
          <ListItemIcon>
            <IconifyIcon icon="mdi:account-group-outline" />
          </ListItemIcon>
          <ListItemText primary="Students" />
        </ListItemButton>
        <ListItemButton>
          <ListItemIcon>
            <IconifyIcon icon="mdi:cog-outline" />
          </ListItemIcon>
          <ListItemText primary="Settings" />
        </ListItemButton>
      </List>
    </LivePreview>
  </>
);

export default DataDisplaySection;
