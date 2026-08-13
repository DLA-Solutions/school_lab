import { useNavigate } from 'react-router';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { BrandLogo, EmptyState } from 'design-system';
import { useTranslation } from 'providers/I18nContext';

const Error404 = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <Container maxWidth="md">
      <Stack
        direction="column"
        minHeight="100vh"
        alignItems="center"
        justifyContent="center"
        textAlign="center"
        gap={2}
      >
        <BrandLogo variant="mark" height={48} />
        <EmptyState
          title={t('error404.title')}
          description={t('error404.description')}
          headingLevel={2}
          action={
            <Button variant="contained" size="large" onClick={() => navigate('/')}>
              {t('error404.home')}
            </Button>
          }
        />
        <Typography variant="h1" fontSize={100} color="text.disabled" aria-hidden>
          404
        </Typography>
      </Stack>
    </Container>
  );
};

export default Error404;
