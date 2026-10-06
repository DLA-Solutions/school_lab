import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { listClasses } from '@mui/material';
import IconifyIcon from 'components/base/IconifyIcon';
import { useTranslation } from 'providers/I18nContext';
import { useActiveMembership } from 'providers/ActiveMembershipContext';
import { AppNotification } from 'types/notification';
import { membershipAudience } from 'utils/membership/audience';
import paths from 'routes/paths';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from 'services/notificationsApi';

// The bell polls rather than pushing: notifications here are all triggered by slow, occasional
// events (a family finishing a signature), so a minute's staleness costs nothing a refresh
// wouldn't already fix, and it avoids a websocket for a badge count.
const POLL_INTERVAL_MS = 60_000;

const NotificationsMenu = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const membership = useActiveMembership();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const open = Boolean(anchorEl);

  const refresh = useCallback(async () => {
    try {
      const response = await listNotifications();
      setNotifications(response.data);
      setUnreadCount(response.meta.unread_count);
    } catch {
      // Silent: a failed poll should not interrupt whatever the user is doing, and the bell
      // simply keeps its last known count until the next successful refresh.
    }
  }, []);

  useEffect(() => {
    // Fetch-on-mount: `refresh` is also reused by the open/mark-as-read handlers below, which is
    // what the lint rule reads as risky, but there is no handler-vs-effect race here — both paths
    // just overwrite the same list with whatever the API currently says.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  useEffect(() => {
    const interval = setInterval(refresh, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [refresh]);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    refresh();
  };

  const handleClose = () => setAnchorEl(null);

  const handleItemClick = async (notification: AppNotification) => {
    if (!notification.read) {
      const updated = await markNotificationRead(notification.id);
      setNotifications((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    }
    handleClose();

    if (notification.kind === 'message' && notification.conversation_id != null && membership) {
      const path =
        membershipAudience(membership) === 'guardian'
          ? paths.communication
          : paths.staffCommunication;
      navigate(`${path}?conversation_id=${notification.conversation_id}`);
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllNotificationsRead();
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
    setUnreadCount(0);
  };

  return (
    <>
      <Tooltip title={t('notifications.title')}>
        <IconButton size="large" sx={{ color: 'text.secondary' }} onClick={handleOpen}>
          <Badge badgeContent={unreadCount} color="error" max={99}>
            <IconifyIcon icon="ion:notifications" />
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        id="notifications-menu"
        open={open}
        onClose={handleClose}
        sx={{ mt: 1.5, [`& .${listClasses.root}`]: { width: 360, maxHeight: 420 } }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" px={2} py={1}>
          <Typography variant="subtitle1">{t('notifications.title')}</Typography>
          {unreadCount > 0 && (
            <Button size="small" onClick={handleMarkAllAsRead}>
              {t('notifications.markAllAsRead')}
            </Button>
          )}
        </Stack>
        <Divider />

        {notifications.length === 0 && (
          <Box px={2} py={3}>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              {t('notifications.empty')}
            </Typography>
          </Box>
        )}

        {notifications.map((notification) => (
          <MenuItem
            key={notification.id}
            onClick={() => handleItemClick(notification)}
            sx={{ whiteSpace: 'normal', alignItems: 'flex-start' }}
          >
            <ListItemText
              primary={
                <Stack direction="row" spacing={1} alignItems="center">
                  {!notification.read && (
                    <Box
                      sx={(theme) => ({
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: (theme.vars || theme).palette.error.main,
                        flexShrink: 0,
                      })}
                    />
                  )}
                  <Typography variant="subtitle2">{notification.title}</Typography>
                </Stack>
              }
              secondary={
                <>
                  <Typography variant="body2" color="text.secondary">
                    {notification.body}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(notification.created_at).toLocaleString()}
                  </Typography>
                </>
              }
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default NotificationsMenu;
