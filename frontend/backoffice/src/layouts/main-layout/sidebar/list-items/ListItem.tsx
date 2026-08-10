import { useState } from 'react';
import { MenuItem } from 'routes/sitemap';
import { useTranslation } from 'providers/I18nContext';
import type { MessageKey } from 'locales';
import type { Theme } from '@mui/material/styles';
import Link from '@mui/material/Link';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText, { listItemTextClasses } from '@mui/material/ListItemText';
import IconifyIcon from 'components/base/IconifyIcon';

const activeLabel = (theme: Theme, brandAccent: boolean) => {
  const palette = (theme.vars || theme).palette;

  return {
    color: palette.text.primary,
    ...(brandAccent ? theme.applyStyles('dark', { color: palette.primary.main }) : {}),
  };
};

const ListItem = ({ subheader, icon, path, active }: MenuItem) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const handleClick = () => {
    setOpen(!open);
  };

  const brandAccent = !!active && path === '/';

  return (
    <ListItemButton
      component={Link}
      href={path}
      onClick={handleClick}
      aria-current={active ? 'page' : undefined}
    >
      <ListItemIcon>
        {icon && (
          <IconifyIcon
            icon={icon}
            sx={{
              color: brandAccent ? 'primary.main' : active ? 'text.primary' : null,
            }}
          />
        )}
      </ListItemIcon>
      <ListItemText
        primary={t(subheader as MessageKey)}
        sx={(theme) => ({
          [`& .${listItemTextClasses.primary}`]: active ? activeLabel(theme, brandAccent) : {},
        })}
      />
    </ListItemButton>
  );
};

export default ListItem;
