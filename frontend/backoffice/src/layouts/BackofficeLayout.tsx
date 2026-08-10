import { PropsWithChildren } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link as RouterLink, useLocation } from 'react-router';
import { useAuth } from 'providers/AuthContext';
import paths from 'routes/paths';

const BackofficeLayout = ({ children }: PropsWithChildren) => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const onSchools = location.pathname === paths.schools || location.pathname.startsWith('/schools/');

  return (
    <Stack minHeight="100vh">
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        px={{ xs: 2, lg: 4 }}
        py={2}
        borderBottom={1}
        borderColor="divider"
      >
        <Stack direction="row" alignItems="center" gap={2}>
          <Typography variant="h6" fontWeight={700}>
            Scholar Premium
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Backoffice
          </Typography>
          <Button
            component={RouterLink}
            to={paths.schools}
            variant={onSchools ? 'contained' : 'text'}
            size="small"
          >
            Escolas
          </Button>
        </Stack>
        <Stack direction="row" alignItems="center" gap={2}>
          <Typography variant="body2" color="text.secondary">
            {user?.email}
          </Typography>
          <Button variant="outlined" size="small" onClick={() => logout()}>
            Sair
          </Button>
        </Stack>
      </Stack>
      <Box component="main" flexGrow={1} px={{ xs: 2, lg: 4 }} py={3}>
        {children}
      </Box>
    </Stack>
  );
};

export default BackofficeLayout;
