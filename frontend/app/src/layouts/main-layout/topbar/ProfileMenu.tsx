import { useState } from 'react';
import Avatar, { avatarClasses } from '@mui/material/Avatar';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Menu from '@mui/material/Menu';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import IconifyIcon from 'components/base/IconifyIcon';
import AvatarImage from 'assets/images/avatar.png';
import { listClasses } from '@mui/material';
import { useAuth } from 'providers/AuthContext';
import { useActiveMembershipContext } from 'providers/ActiveMembershipContext';
import { useTranslation } from 'providers/I18nContext';
import { membershipDisplayRole } from 'utils/membership/audience';

const ProfileMenu = () => {
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const { user, logout } = useAuth();
  const { activeMembership, eligibleMemberships, selectMembership } = useActiveMembershipContext();

  const handleProfileClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const userName = user?.email.split('@')[0] ?? 'User';
  const activeRoleLabel = activeMembership
    ? membershipDisplayRole(activeMembership, t)
    : null;

  return (
    <>
      <Tooltip title={t('common.profile')}>
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
            width: 280,
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
            {activeMembership && activeRoleLabel && (
              <Typography variant="caption" fontWeight={400} color="text.secondary">
                {[activeRoleLabel, activeMembership.school_name].filter(Boolean).join(' · ')}
              </Typography>
            )}
          </Stack>
        </MenuItem>

        {eligibleMemberships.length > 1 && (
          <>
            <Divider />
            <MenuItem disabled sx={{ opacity: 1, py: 0.75 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                {t('membership.switchContext')}
              </Typography>
            </MenuItem>
            {eligibleMemberships.map((membership) => {
              const roleLabel = membershipDisplayRole(membership, t);
              const isActive = membership.id === activeMembership?.id;

              return (
                <MenuItem
                  key={membership.id}
                  selected={isActive}
                  onClick={() => {
                    if (!isActive) {
                      selectMembership(membership);
                    }
                  }}
                >
                  <ListItemText
                    primary={roleLabel}
                    secondary={membership.school_name ?? undefined}
                    primaryTypographyProps={{ variant: 'body2' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                  {isActive && (
                    <ListItemIcon sx={{ minWidth: 28, justifyContent: 'flex-end' }}>
                      <IconifyIcon icon="mingcute:check-line" />
                    </ListItemIcon>
                  )}
                </MenuItem>
              );
            })}
          </>
        )}

        <Divider />

        <MenuItem onClick={() => void logout()} sx={{ py: 1 }}>
          <ListItemIcon sx={{ mr: 2, fontSize: 'button.fontSize' }}>
            <IconifyIcon icon="material-symbols:logout" />
          </ListItemIcon>
          <Typography variant="body2" color="text.secondary">
            {t('common.logout')}
          </Typography>
        </MenuItem>
      </Menu>
    </>
  );
};

export default ProfileMenu;
