import { PropsWithChildren } from 'react';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import ButtonBase from '@mui/material/ButtonBase';
import { BrandLogo } from 'design-system';

const AuthLayout = ({ children }: PropsWithChildren) => {
  return (
    <Stack component="main" direction="column" p={{ xs: 1, md: 3.5 }} width={1} minHeight="100vh">
      <Stack direction="column" my="auto" py={5} alignItems="center" justifyContent="center">
        <Stack direction="column" alignItems="center" width={1} maxWidth={450} gap={3}>
          <ButtonBase component={Link} href="/" disableRipple sx={{ maxWidth: 1 }}>
            <BrandLogo variant="lockup" height={64} />
          </ButtonBase>
          <Paper sx={{ py: 4, width: 1 }}>{children}</Paper>
        </Stack>
      </Stack>
    </Stack>
  );
};

export default AuthLayout;
