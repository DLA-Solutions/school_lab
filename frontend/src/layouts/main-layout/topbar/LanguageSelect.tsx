import { useState } from 'react';
import Menu from '@mui/material/Menu';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import IconifyIcon from 'components/base/IconifyIcon';
import { LANGUAGES, Language, DEFAULT_LANGUAGE } from 'locales';

/**
 * The product speaks one language, and the flag says which. It used to offer five — English,
 * Bengali, Chinese, Turkish — none of which translated anything: picking one changed the flag and
 * left every screen exactly as it was. A control that promises a language it cannot deliver is
 * worse than no control, so the list now holds the locale the interface is actually written in.
 *
 * Adding a second one means adding it to `src/locales` first; the menu follows from there.
 */
const LanguageSelect = () => {
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleFlagButtonClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleFlagMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageItemClick = (langItem: Language) => {
    setLanguage(langItem);
    handleFlagMenuClose();
  };

  return (
    <>
      <Tooltip title={`${language.label} - ${language.code}`}>
        <IconButton
          onClick={handleFlagButtonClick}
          sx={{ fontSize: 'h4.fontSize' }}
          aria-label="Language"
          aria-controls={open ? 'language-menu' : undefined}
          aria-expanded={open ? 'true' : undefined}
          aria-haspopup="true"
        >
          <IconifyIcon icon={language.flag} />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        id="language-menu"
        open={open}
        onClose={handleFlagMenuClose}
        onClick={handleFlagMenuClose}
        slotProps={{
          paper: {
            elevation: 0,
            sx: {
              mt: 1.5,
              p: '0 !important',
              width: 240,
              overflow: 'hidden',
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {LANGUAGES.map((langItem) => {
          return (
            <MenuItem
              key={langItem.code}
              selected={langItem.code === language.code}
              onClick={() => handleLanguageItemClick(langItem)}
            >
              <ListItemIcon sx={{ mr: 2, fontSize: 'h3.fontSize' }}>
                <IconifyIcon icon={langItem.flag} />
              </ListItemIcon>
              <ListItemText>
                <Typography>{langItem.label}</Typography>
              </ListItemText>
              <ListItemText>
                <Typography textAlign="right">{langItem.code}</Typography>
              </ListItemText>
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
};

export default LanguageSelect;
