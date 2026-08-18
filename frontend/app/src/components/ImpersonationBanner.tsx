import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'providers/I18nContext';
import { useAuth } from 'providers/AuthContext';

/**
 * Persistent banner shown during DLA support impersonation sessions.
 */
const ImpersonationBanner = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const impersonation = user?.impersonation;

  if (!impersonation?.active) {
    return null;
  }

  return (
    <Alert
      severity="warning"
      variant="filled"
      data-testid="impersonation-banner"
      sx={{
        borderRadius: 0,
        justifyContent: 'center',
        '& .MuiAlert-message': { width: 1, textAlign: 'center' },
      }}
    >
      <Typography variant="body2" component="span" fontWeight={600}>
        {t('impersonation.banner.title')}
      </Typography>
      {' — '}
      <Typography variant="body2" component="span">
        {t('impersonation.banner.detail', {
          operator: impersonation.operator_email ?? '—',
          school: impersonation.school_name ?? '—',
        })}
      </Typography>
    </Alert>
  );
};

export default ImpersonationBanner;
