import { useCallback, useEffect, useState } from 'react';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { ErrorBanner, SuccessBanner } from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { ApiError } from 'services/api';
import { getSchoolModules, updateSchoolModules } from 'services/modulesApi';
import { SCHOOL_MODULE_KEYS, SchoolModuleKey, SchoolModulesMap } from 'types/modules';

const DEFAULT_MODULES: SchoolModulesMap = {
  communication: true,
  academic: true,
  billing: true,
  documents: true,
};

type SchoolModulesSectionProps = {
  schoolId: number;
  /** When provided, skips the initial GET and uses this map. */
  initialModules?: SchoolModulesMap;
  onModulesChange?: (modules: SchoolModulesMap) => void;
};

const SchoolModulesSection = ({
  schoolId,
  initialModules,
  onModulesChange,
}: SchoolModulesSectionProps) => {
  const { t } = useTranslation();
  const [modules, setModules] = useState<SchoolModulesMap>(initialModules ?? DEFAULT_MODULES);
  const [loading, setLoading] = useState(initialModules === undefined);
  const [loadError, setLoadError] = useState('');
  const [updatingKey, setUpdatingKey] = useState<SchoolModuleKey | null>(null);
  const [bannerError, setBannerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (initialModules !== undefined) {
      setModules(initialModules);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setLoadError('');

      try {
        const data = await getSchoolModules(schoolId);
        if (!cancelled) {
          setModules(data);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof ApiError
              ? error.message
              : t('backoffice.modules.loadError'),
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [initialModules, schoolId, t]);

  const handleToggle = useCallback(
    async (key: SchoolModuleKey) => {
      const previous = modules;
      const nextValue = !modules[key];
      const optimistic = { ...modules, [key]: nextValue };

      setModules(optimistic);
      setBannerError('');
      setSuccessMessage('');
      setUpdatingKey(key);

      try {
        const updated = await updateSchoolModules(schoolId, { [key]: nextValue });
        setModules(updated);
        onModulesChange?.(updated);
        setSuccessMessage(t('backoffice.modules.updateSuccess'));
      } catch (error) {
        setModules(previous);
        setBannerError(
          error instanceof ApiError ? error.message : t('backoffice.modules.updateError'),
        );
      } finally {
        setUpdatingKey(null);
      }
    },
    [modules, onModulesChange, schoolId, t],
  );

  if (loading) {
    return (
      <Stack alignItems="center" py={2}>
        <CircularProgress size={24} aria-label={t('backoffice.modules.loading')} />
      </Stack>
    );
  }

  if (loadError) {
    return <ErrorBanner message={loadError} />;
  }

  return (
    <Stack direction="column" gap={2}>
      <Typography variant="body2" color="text.secondary">
        {t('backoffice.modules.description')}
      </Typography>

      {SCHOOL_MODULE_KEYS.map((key) => (
        <FormControlLabel
          key={key}
          control={
            <Switch
              checked={modules[key]}
              onChange={() => handleToggle(key)}
              disabled={updatingKey !== null}
              inputProps={{ 'aria-label': t(`backoffice.modules.${key}`) }}
            />
          }
          label={t(`backoffice.modules.${key}`)}
        />
      ))}

      {bannerError && <ErrorBanner message={bannerError} />}
      {successMessage && <SuccessBanner variant="outlined" message={successMessage} />}
    </Stack>
  );
};

export default SchoolModulesSection;
