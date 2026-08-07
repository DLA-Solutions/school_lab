import { PropsWithChildren } from 'react';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import ButtonBase from '@mui/material/ButtonBase';
import { BrandLogo } from 'design-system';

const AuthLayout = ({ children }: PropsWithChildren) => {
  return (
    <Stack component="main" direction="column" p={{ xs: 1, md: 3.5 }} width={1} minHeight="100vh">
      <Stack width={1}>
        <ButtonBase component={Link} href="/" disableRipple>
          <BrandLogo variant="lockup" height={32} />
        </ButtonBase>
      </Stack>
      <Stack my="auto" py={5} alignItems="center" justifyContent="center">
        <Paper sx={{ py: 4, width: 1, maxWidth: 450 }}>{children}</Paper>
      </Stack>
    </Stack>
  );
};

export default AuthLayout;
