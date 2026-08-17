import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { Link as RouterLink } from 'react-router';
import { EmptyState, PageHeader, SectionCard } from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import paths from 'routes/paths';

const GuardianDashboard = () => {
  const { t } = useTranslation();

  const quickLinks = [
    {
      key: 'preceptorship',
      title: t('dashboard.guardian.link.preceptorship'),
      description: t('dashboard.guardian.link.preceptorshipDescription'),
      to: paths.myPreceptorship,
    },
    {
      key: 'myRequests',
      title: t('dashboard.guardian.link.myRequests'),
      description: t('dashboard.guardian.link.myRequestsDescription'),
      to: paths.myRequests,
    },
    {
      key: 'myCharges',
      title: t('dashboard.guardian.link.myCharges'),
      description: t('dashboard.guardian.link.myChargesDescription'),
      to: paths.myCharges,
    },
    {
      key: 'myHealthRecords',
      title: t('health.myChildren.title'),
      description: t('health.myChildren.description'),
      to: paths.myHealthRecords,
    },
    {
      key: 'myReportCards',
      title: t('dashboard.guardian.link.myReportCards'),
      description: t('dashboard.guardian.link.myReportCardsDescription'),
      to: paths.myReportCards,
    },
    {
      key: 'myTaxDeclarations',
      title: t('dashboard.guardian.link.myTaxDeclarations'),
      description: t('dashboard.guardian.link.myTaxDeclarationsDescription'),
      to: paths.myTaxDeclarations,
    },
  ];

  return (
    <Stack spacing={3}>
      <PageHeader title={t('dashboard.guardian.title')} />

      <EmptyState
        title={t('dashboard.guardian.welcome.title')}
        description={t('dashboard.guardian.welcome.description')}
        headingLevel={2}
      />

      <SectionCard title={t('dashboard.guardian.quickLinks.title')}>
        <Grid container spacing={2.5}>
          {quickLinks.map((link) => (
            <Grid key={link.key} size={{ xs: 12, md: 6 }}>
              <Stack spacing={1.5} height={1}>
                <Typography variant="subtitle1">{link.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {link.description}
                </Typography>
                <Button
                  component={RouterLink}
                  to={link.to}
                  variant="outlined"
                  sx={{ alignSelf: 'flex-start' }}
                >
                  {link.title}
                </Button>
              </Stack>
            </Grid>
          ))}
        </Grid>
      </SectionCard>
    </Stack>
  );
};

export default GuardianDashboard;
