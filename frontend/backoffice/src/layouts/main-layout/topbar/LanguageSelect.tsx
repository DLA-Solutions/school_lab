import { useState } from 'react';
import Menu from '@mui/material/Menu';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import IconifyIcon from 'components/base/IconifyIcon';
import { LANGUAGES, Language } from 'locales';
import { useTranslation } from 'providers/I18nContext';

const LanguageSelect = () => {
  const { language, setLocale, t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleFlagButtonClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleFlagMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageItemClick = (langItem: Language) => {
    setLocale(langItem.code);
    handleFlagMenuClose();
  };

  return (
    <>
      <Tooltip title={`${language.label} - ${language.code}`}>
        <IconButton
          onClick={handleFlagButtonClick}
          sx={{ fontSize: 'h4.fontSize' }}
          aria-label={t('nav.language')}
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
