import { MenuItem } from 'routes/sitemap';
import { useTranslation } from 'providers/I18nContext';
import type { MessageKey } from 'locales';
import type { Theme } from '@mui/material/styles';
import Link from '@mui/material/Link';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText, { listItemTextClasses } from '@mui/material/ListItemText';
import IconifyIcon from 'components/base/IconifyIcon';

// State is carried by colour instead of dimming inactive items. Inactive labels stay at
// `text.secondary` (9.71:1 dark, 7.18:1 light). Active items use brand purple on the icon in
// both schemes; labels use `primary.main` in dark (5.05:1) and `primary.dark` in light (AA text
// on the near-white backdrop). Light cannot use `primary.main` on text (3.56:1 — F9). A left
// border and stronger selected background in light add emphasis beyond colour alone.
const activeLabel = (theme: Theme) => {
  const palette = (theme.vars || theme).palette;

  return {
    color: palette.text.primary,
    fontWeight: 600,
    ...theme.applyStyles('dark', { color: palette.primary.main }),
    ...theme.applyStyles('light', { color: palette.primary.dark }),
  };
};

const activeButtonSx = (theme: Theme) => ({
  borderLeft: '3px solid',
  borderColor: (theme.vars || theme).palette.primary.main,
  bgcolor: 'surface.alt',
  '&.Mui-selected': { bgcolor: 'surface.alt' },
  '&.Mui-selected:hover': { bgcolor: 'surface.alt' },
  ...theme.applyStyles('light', {
    bgcolor: 'action.selected',
    '&.Mui-selected': { bgcolor: 'action.selected' },
    '&.Mui-selected:hover': { bgcolor: 'action.selected' },
  }),
});

interface SidebarListItemProps extends MenuItem {
  active?: boolean;
}

const ListItem = ({ subheader, icon, path, active = false }: SidebarListItemProps) => {
  const { t } = useTranslation();

  return (
    <ListItemButton
      component={Link}
      href={path}
      selected={active}
      aria-current={active ? 'page' : undefined}
      sx={(theme) =>
        active
          ? activeButtonSx(theme)
          : {
              borderLeft: '3px solid transparent',
            }
      }
    >
      <ListItemIcon sx={{ color: active ? 'primary.main' : undefined }}>
        {icon && <IconifyIcon icon={icon} />}
      </ListItemIcon>
      <ListItemText
        primary={t(subheader as MessageKey)}
        sx={(theme) => ({
          [`& .${listItemTextClasses.primary}`]: active ? activeLabel(theme) : {},
        })}
      />
    </ListItemButton>
  );
};

export default ListItem;
