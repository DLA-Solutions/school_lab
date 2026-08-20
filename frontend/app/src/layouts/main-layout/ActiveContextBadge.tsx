import { useState } from 'react';
import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import IconifyIcon from 'components/base/IconifyIcon';
import { ContextBadge } from 'design-system';
import { useActiveMembershipContext } from 'providers/ActiveMembershipContext';
import { useTranslation } from 'providers/I18nContext';
import {
  membershipContextBadgeLabels,
  membershipContextBadgeTooltip,
  membershipContextBadgeVariant,
} from 'utils/membership/contextBadge';
import { membershipSwitchPrimary, membershipSwitchSecondary } from 'utils/membership/switchLabel';

const ActiveContextBadge = () => {
  const { t } = useTranslation();
  const { activeMembership, eligibleMemberships, selectMembership } = useActiveMembershipContext();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  if (!activeMembership) {
    return null;
  }

  const variant = membershipContextBadgeVariant(activeMembership);
  const { label, secondaryLabel } = membershipContextBadgeLabels(
    activeMembership,
    t,
    eligibleMemberships,
  );
  const tooltip = membershipContextBadgeTooltip(activeMembership, t, eligibleMemberships);
  const canSwitch = eligibleMemberships.length > 1;

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    if (canSwitch) {
      setAnchorEl(event.currentTarget);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <Box width={1}>
      <ContextBadge
        variant={variant}
        label={label}
        secondaryLabel={secondaryLabel}
        tooltip={canSwitch ? t('membership.switchContextHint') : tooltip}
        onClick={canSwitch ? handleOpen : undefined}
      />

      {canSwitch && (
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
          transformOrigin={{ horizontal: 'left', vertical: 'top' }}
          slotProps={{ paper: { sx: { minWidth: 260 } } }}
        >
          {eligibleMemberships.map((membership) => {
            const roleLabel = membershipSwitchPrimary(membership, t);
            const schoolLabel = membershipSwitchSecondary(membership, t, eligibleMemberships);
            const isActive = membership.id === activeMembership.id;

            return (
              <MenuItem
                key={membership.id}
                selected={isActive}
                onClick={() => {
                  handleClose();
                  if (!isActive) {
                    selectMembership(membership);
                  }
                }}
              >
                <ListItemText
                  primary={roleLabel}
                  secondary={schoolLabel}
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
        </Menu>
      )}
    </Box>
  );
};

export default ActiveContextBadge;
