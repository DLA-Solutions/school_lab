import { useState } from 'react';
import { useNavigate } from 'react-router';
import Avatar, { avatarClasses } from '@mui/material/Avatar';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Menu from '@mui/material/Menu';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import IconifyIcon from 'components/base/IconifyIcon';
import AvatarImage from 'assets/images/avatar.png';
import { listClasses } from '@mui/material';
import { useAuth } from 'providers/AuthContext';
import { useTranslation } from 'providers/I18nContext';
import paths from 'routes/paths';

const ProfileMenu = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleProfileClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const userName = user?.email.split('@')[0] ?? 'User';
  const backofficeMembership = user?.memberships.find(
    (membership) => membership.role === 'backoffice' && membership.status === 'active',
  );
  const roleLabel =
    backofficeMembership?.role_template?.name ?? backofficeMembership?.role ?? 'backoffice';

  return (
    <>
      <Tooltip title="Profile">
        <ButtonBase
          onClick={handleProfileClick}
          disableRipple
          aria-controls={open ? 'profile-menu' : undefined}
          aria-expanded={open ? 'true' : undefined}
          aria-haspopup="true"
        >
          <Stack spacing={1} alignItems="center">
            <Avatar
              src={AvatarImage}
              sx={(theme) => ({
                ml: 0.8,
                height: 32,
                width: 32,
                bgcolor: (theme.vars || theme).palette.primary.main,
              })}
            />
            <Typography variant="subtitle2">{userName}</Typography>
          </Stack>
        </ButtonBase>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        id="profile-menu"
        open={open}
        onClose={handleProfileMenuClose}
        onClick={handleProfileMenuClose}
        sx={{
          mt: 1.5,
          [`& .${listClasses.root}`]: {
            width: 240,
            [`& .${avatarClasses.root}`]: {
              width: 36,
              height: 36,
              mr: 1.25,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleProfileMenuClose} sx={{ '&:hover': { bgcolor: 'background.paper' } }}>
          <Avatar
            src={AvatarImage}
            sx={{
              bgcolor: 'primary.main',
            }}
          />
          <Stack direction="column">
            <Typography variant="body2" fontWeight={500}>
              {userName}
            </Typography>
            <Typography variant="caption" fontWeight={400} color="text.secondary">
              {user?.email}
            </Typography>
            {backofficeMembership && (
              <Typography variant="caption" fontWeight={400} color="text.secondary">
                {roleLabel}
              </Typography>
            )}
          </Stack>
        </MenuItem>

        <Divider />

        <MenuItem onClick={() => navigate(paths.profile)} sx={{ py: 1 }}>
          <ListItemIcon sx={{ mr: 2, fontSize: 'button.fontSize' }}>
            <IconifyIcon icon="material-symbols:person-outline" />
          </ListItemIcon>
          <Typography variant="body2" color="text.secondary">
            {t('shell.profile.myAccount')}
          </Typography>
        </MenuItem>

        <MenuItem onClick={() => void logout()} sx={{ py: 1 }}>
          <ListItemIcon sx={{ mr: 2, fontSize: 'button.fontSize' }}>
            <IconifyIcon icon="material-symbols:logout" />
          </ListItemIcon>
          <Typography variant="body2" color="text.secondary">
            Logout
          </Typography>
        </MenuItem>
      </Menu>
    </>
  );
};

export default ProfileMenu;
