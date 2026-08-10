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

// The current destination used to be signalled by dimming every *other* one with `opacity: 0.3`.
// That put the label of every non-current nav item at 1.93:1 in dark and 1.59:1 in light — the
// worst text result in the accessibility audit, on the control users touch most — and, because
// opacity composites the whole box, it also dimmed the focus ring on that same control to 1.45:1.
//
// State is carried by colour instead. Inactive items keep the themed `text.secondary` at full
// opacity (9.71:1 dark, 7.18:1 light) and active items are promoted to `text.primary` (18.83:1 /
// 16.70:1), which is a stronger separation than the dimming ever gave. `aria-current` carries the
// same state for assistive technology.
const activeLabel = (theme: Theme, brandAccent: boolean) => {
  const palette = (theme.vars || theme).palette;

  return {
    color: palette.text.primary,
    // The dashboard root is the one item wearing the brand purple. It holds 5.05:1 on the dark
    // backdrop and stays; on the near-white light backdrop the same purple is 3.56:1, so light
    // falls back to `text.primary` and keeps the accent on the icon, where the 3:1 threshold for
    // graphical objects applies instead.
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
