import { SyntheticEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import { ErrorBanner, InfoBanner, SectionCard, SuccessBanner } from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { ApiError } from 'services/api';
import { fetchFiscalSettings, updateFiscalSettings } from 'services/fiscalSettingsApi';
import { searchSupportedCities } from 'services/supportedCitiesApi';
import { FiscalSettings, FiscalSettingsPayload } from 'types/fiscalSettings';
import { SupportedCity } from 'types/supportedCity';
import { useDebouncedValue } from 'utils/useDebouncedValue';

export interface FiscalSettingsCardProps {
  schoolId: number;
}

const cityLabel = (city: SupportedCity) => `${city.name} — ${city.state} (${city.code})`;

const parseOptionalPercent = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

const providerOptionRequiresField = (
  snapshot: Record<string, unknown>,
  field: 'city_service_code' | 'nbs_code' | 'national_taxation_code',
) => {
  const required = snapshot.requiredFields;
  if (Array.isArray(required) && required.includes(field)) {
    return true;
  }

  const flags = snapshot[field];
  return flags === true || flags === 'required';
};

/**
 * NFS-e municipal configuration for the school.
 *
 * Sits beside bank credentials on billing settings — same screen, separate save path, because city
 * validation and Spedy credentials are a different concern from boleto mora and multa.
 */
const FiscalSettingsCard = ({ schoolId }: FiscalSettingsCardProps) => {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const [enabled, setEnabled] = useState(false);
  const [selectedCity, setSelectedCity] = useState<SupportedCity | null>(null);
  const [cityInput, setCityInput] = useState('');
  const [cityOptions, setCityOptions] = useState<SupportedCity[]>([]);
  const [cityLoading, setCityLoading] = useState(false);
  const debouncedCityQuery = useDebouncedValue(cityInput, 300);

  const [providerOptionsSnapshot, setProviderOptionsSnapshot] = useState<Record<string, unknown>>({});
  const [providerName, setProviderName] = useState('');
  const [federalServiceCode, setFederalServiceCode] = useState('');
  const [cnaeCode, setCnaeCode] = useState('');
  const [cityServiceCode, setCityServiceCode] = useState('');
  const [nbsCode, setNbsCode] = useState('');
  const [nationalTaxationCode, setNationalTaxationCode] = useState('');
  const [issRatePercent, setIssRatePercent] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [issueType, setIssueType] = useState('');

  const applySettings = useCallback((settings: FiscalSettings) => {
    setEnabled(settings.enabled);
    setProviderOptionsSnapshot(settings.provider_options_snapshot ?? {});
    setFederalServiceCode(settings.federal_service_code ?? '');
    setCnaeCode(settings.cnae_code ?? '');
    setCityServiceCode(settings.city_service_code ?? '');
    setNbsCode(settings.nbs_code ?? '');
    setNationalTaxationCode(settings.national_taxation_code ?? '');
    setIssRatePercent(
      settings.iss_rate_percent != null ? String(settings.iss_rate_percent) : '',
    );
    setServiceDescription(settings.service_description ?? '');
    setIssueType(settings.issue_type ?? '');

    if (settings.spedy_city_code > 0) {
      const city: SupportedCity = {
        code: settings.spedy_city_code,
        name: settings.issuance_city_name,
        state: settings.issuance_state,
        provider: '',
        provider_options: settings.provider_options_snapshot ?? {},
      };
      setSelectedCity(city);
      setCityInput(cityLabel(city));
    } else {
      setSelectedCity(null);
      setCityInput('');
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      applySettings(await fetchFiscalSettings(schoolId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('fiscalSettings.loadError'));
    } finally {
      setLoading(false);
    }
  }, [applySettings, schoolId, t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (debouncedCityQuery.trim().length < 2) {
      setCityOptions([]);
      return;
    }

    const search = async () => {
      setCityLoading(true);

      try {
        setCityOptions(
          await searchSupportedCities({
            schoolId,
            query: debouncedCityQuery.trim(),
          }),
        );
      } catch {
        setCityOptions([]);
      } finally {
        setCityLoading(false);
      }
    };

    search();
  }, [debouncedCityQuery, schoolId]);

  const showCityServiceCode = useMemo(
    () => providerOptionRequiresField(providerOptionsSnapshot, 'city_service_code'),
    [providerOptionsSnapshot],
  );
  const showNbsCode = useMemo(
    () => providerOptionRequiresField(providerOptionsSnapshot, 'nbs_code'),
    [providerOptionsSnapshot],
  );
  const showNationalTaxationCode = useMemo(
    () => providerOptionRequiresField(providerOptionsSnapshot, 'national_taxation_code'),
    [providerOptionsSnapshot],
  );

  const handleCityChange = (_event: SyntheticEvent, city: SupportedCity | null) => {
    setSelectedCity(city);
    setProviderName(city?.provider ?? '');
    setProviderOptionsSnapshot(city?.provider_options ?? {});
    setSaved(false);
    setError('');
    setFieldErrors({});
  };

  const submit = async () => {
    if (!selectedCity) {
      setError(t('fiscalSettings.cityRequired'));
      return;
    }

    setSaving(true);
    setError('');
    setFieldErrors({});
    setSaved(false);

    const payload: FiscalSettingsPayload = {
      enabled,
      issuance_city_name: selectedCity.name,
      issuance_state: selectedCity.state,
      spedy_city_code: selectedCity.code,
      provider_options_snapshot: selectedCity.provider_options,
      federal_service_code: federalServiceCode.trim() || null,
      cnae_code: cnaeCode.trim() || null,
      city_service_code: cityServiceCode.trim() || null,
      nbs_code: nbsCode.trim() || null,
      national_taxation_code: nationalTaxationCode.trim() || null,
      iss_rate_percent: parseOptionalPercent(issRatePercent),
      service_description: serviceDescription.trim() || null,
      issue_type: issueType.trim() || null,
    };

    try {
      applySettings(await updateFiscalSettings(schoolId, payload));
      setSaved(true);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'validation_error') {
        const details = err.details as Record<string, string[]>;
        const mapped = Object.fromEntries(
          Object.entries(details).map(([key, messages]) => [key, messages[0] ?? '']),
        );
        setFieldErrors(mapped);
        setError(t('fiscalSettings.validationError'));
      } else {
        setError(err instanceof ApiError ? err.message : t('fiscalSettings.saveError'));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard title={t('fiscalSettings.title')}>
      {loading ? (
        <Stack alignItems="center" py={4}>
          <CircularProgress />
        </Stack>
      ) : (
        <Stack direction="column" gap={2.5}>
          <FormControlLabel
            control={
              <Switch
                checked={enabled}
                onChange={(event) => {
                  setEnabled(event.target.checked);
                  setSaved(false);
                }}
              />
            }
            label={t('fiscalSettings.enabled')}
          />

          {providerName ? (
            <InfoBanner
              message={t('fiscalSettings.providerInfo', { provider: providerName })}
            />
          ) : null}

          <Autocomplete
            options={cityOptions}
            loading={cityLoading}
            value={selectedCity}
            inputValue={cityInput}
            onInputChange={(_event, value) => setCityInput(value)}
            onChange={handleCityChange}
            getOptionLabel={(option) => cityLabel(option)}
            isOptionEqualToValue={(option, value) => option.code === value.code}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t('fiscalSettings.city')}
                helperText={t('fiscalSettings.cityHelp')}
                error={Boolean(fieldErrors.spedy_city_code)}
              />
            )}
            noOptionsText={t('fiscalSettings.cityEmpty')}
          />

          <TextField
            label={t('fiscalSettings.federalServiceCode')}
            value={federalServiceCode}
            onChange={(event) => setFederalServiceCode(event.target.value)}
            error={Boolean(fieldErrors.federal_service_code)}
            helperText={fieldErrors.federal_service_code}
            fullWidth
          />

          <TextField
            label={t('fiscalSettings.cnaeCode')}
            value={cnaeCode}
            onChange={(event) => setCnaeCode(event.target.value)}
            error={Boolean(fieldErrors.cnae_code)}
            helperText={fieldErrors.cnae_code}
            fullWidth
          />

          {showCityServiceCode ? (
            <TextField
              label={t('fiscalSettings.cityServiceCode')}
              value={cityServiceCode}
              onChange={(event) => setCityServiceCode(event.target.value)}
              error={Boolean(fieldErrors.city_service_code)}
              helperText={fieldErrors.city_service_code}
              fullWidth
            />
          ) : null}

          {showNbsCode ? (
            <TextField
              label={t('fiscalSettings.nbsCode')}
              value={nbsCode}
              onChange={(event) => setNbsCode(event.target.value)}
              error={Boolean(fieldErrors.nbs_code)}
              helperText={fieldErrors.nbs_code}
              fullWidth
            />
          ) : null}

          {showNationalTaxationCode ? (
            <TextField
              label={t('fiscalSettings.nationalTaxationCode')}
              value={nationalTaxationCode}
              onChange={(event) => setNationalTaxationCode(event.target.value)}
              error={Boolean(fieldErrors.national_taxation_code)}
              helperText={fieldErrors.national_taxation_code}
              fullWidth
            />
          ) : null}

          <TextField
            label={t('fiscalSettings.issRatePercent')}
            value={issRatePercent}
            onChange={(event) => setIssRatePercent(event.target.value)}
            InputProps={{
              endAdornment: <InputAdornment position="end">%</InputAdornment>,
            }}
            error={Boolean(fieldErrors.iss_rate_percent)}
            helperText={fieldErrors.iss_rate_percent || t('fiscalSettings.issRatePercentHelp')}
            fullWidth
          />

          <TextField
            label={t('fiscalSettings.serviceDescription')}
            value={serviceDescription}
            onChange={(event) => setServiceDescription(event.target.value)}
            inputProps={{ maxLength: 255 }}
            error={Boolean(fieldErrors.service_description)}
            helperText={fieldErrors.service_description || t('fiscalSettings.serviceDescriptionHelp')}
            fullWidth
          />

          <TextField
            label={t('fiscalSettings.issueType')}
            value={issueType}
            onChange={(event) => setIssueType(event.target.value)}
            helperText={t('fiscalSettings.issueTypeHelp')}
            error={Boolean(fieldErrors.issue_type)}
            fullWidth
          />

          <InfoBanner message={t('fiscalSettings.help')} />

          {saved ? <SuccessBanner message={t('fiscalSettings.saved')} /> : null}
          {error ? <ErrorBanner message={error} /> : null}

          <Box>
            <Button type="button" variant="contained" disabled={saving} onClick={submit}>
              {saving ? <CircularProgress size={24} color="inherit" /> : t('fiscalSettings.save')}
            </Button>
          </Box>
        </Stack>
      )}
    </SectionCard>
  );
};

export default FiscalSettingsCard;
