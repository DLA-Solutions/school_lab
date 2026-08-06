import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
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
  <Stack direction="column" spacing={3}>
    <Box>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Avatar
      </Typography>
      <LivePreview>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <Avatar sx={{ bgcolor: 'primary.main' }}>DS</Avatar>
          <Avatar sx={{ bgcolor: 'secondary.main' }}>
            <IconifyIcon icon="mdi:account" />
          </Avatar>
          <Avatar>?</Avatar>
        </Stack>
      </LivePreview>
    </Box>

    <Box>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Progress
      </Typography>
      <LivePreview>
        <Stack direction="column" spacing={2}>
          <Stack direction="row" spacing={3} alignItems="center" flexWrap="wrap" useFlexGap>
            <CircularProgress />
            <CircularProgress color="secondary" />
            <CircularProgress size={16} color="inherit" />
          </Stack>
          <LinearProgress />
          <LinearProgress color="secondary" variant="determinate" value={60} />
        </Stack>
      </LivePreview>
    </Box>

    <Box>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Badge
      </Typography>
      <LivePreview>
        <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap alignItems="center">
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
    </Box>

    <Box>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Skeleton
      </Typography>
      <LivePreview>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ maxWidth: 360 }}>
          <Skeleton variant="circular" width={40} height={40} />
          <Stack direction="column" spacing={0.5} flex={1} minWidth={0}>
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="40%" />
          </Stack>
        </Stack>
      </LivePreview>
    </Box>

    <Box>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        ListItemButton
      </Typography>
      <LivePreview>
        <Box sx={{ maxWidth: 280 }}>
          <List disablePadding>
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
        </Box>
      </LivePreview>
    </Box>
  </Stack>
);

export default DataDisplaySection;
