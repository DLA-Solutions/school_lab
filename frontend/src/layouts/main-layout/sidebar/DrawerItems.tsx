import { topListData } from 'data/sidebarListData';
import Box from '@mui/material/Box';
import { Link as RouterLink } from 'react-router';
import paths from 'routes/paths';
import List from '@mui/material/List';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import IconifyIcon from 'components/base/IconifyIcon';
import { BrandLogo } from 'design-system';
import { useAuth } from 'providers/AuthContext';
import ListItem from './list-items/ListItem';

const DrawerItems = () => {
  const { logout } = useAuth();

  return (
    <>
      <Stack
        pt={5}
        pb={4}
        px={3.5}
        position={'sticky'}
        top={0}
        bgcolor="background.default"
        alignItems="flex-start"
        justifyContent="flex-start"
        zIndex="appBar"
        width={1}
      >
        <ButtonBase
          component={RouterLink}
          to={paths.dashboard}
          disableRipple
          sx={{ width: 1, justifyContent: 'flex-start' }}
        >
          <BrandLogo
            variant="lockup"
            sx={{
              width: 1,
              maxWidth: 1,
              height: 'auto',
              '& img': {
                width: '100%',
                height: 'auto',
              },
            }}
          />
        </ButtonBase>
      </Stack>

      <Box px={3.5} pb={3} pt={1}>
        <TextField
          variant="filled"
          placeholder="Search for..."
          sx={{ width: 1 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <IconifyIcon icon="mingcute:search-line" />
                </InputAdornment>
              ),
            },
            htmlInput: {
              'aria-label': 'Search',
            },
          }}
        />
      </Box>

      <List component="nav" sx={{ px: 2.5 }}>
        {topListData.map((route) => {
          return <ListItem key={route.id} {...route} />;
        })}
      </List>

      <Box px={3.5} pt={6} pb={12} width={1}>
        <Button
          variant="contained"
          color="secondary"
          size="large"
          onClick={() => void logout()}
          startIcon={<IconifyIcon icon="material-symbols:logout" />}
          sx={{ width: 1 }}
        >
          Logout
        </Button>
      </Box>
    </>
  );
};

export default DrawerItems;
