import { FormEvent, useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import InputAdornment from '@mui/material/InputAdornment';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ErrorBanner, PageHeader, SectionCard } from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { useCurrentSchool } from 'providers/useCurrentSchool';
import { ApiError } from 'services/api';
import { fetchBillingSettings, updateBillingSettings } from 'services/billingSettingsApi';
import { BillingSettings, BillingSettingsPayload, FineType } from 'types/billingSettings';
import { formatCentsInput, parseCents } from 'utils/money';

type FineMode = 'off' | FineType;

const parseOptionalPercent = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

const BillingSettingsPage = () => {
  const { t } = useTranslation();
  const school = useCurrentSchool();
  const schoolId = school?.school_id ?? null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const [overdueGraceDays, setOverdueGraceDays] = useState('3');
  const [serviceDescription, setServiceDescription] = useState('');
  const [interestRatePercent, setInterestRatePercent] = useState('');
  const [earlyPaymentDiscountPercent, setEarlyPaymentDiscountPercent] = useState('');
  const [fineMode, setFineMode] = useState<FineMode>('off');
  const [fineRatePercent, setFineRatePercent] = useState('');
  const [fineAmount, setFineAmount] = useState('');

  const applySettings = useCallback((settings: BillingSettings) => {
    setOverdueGraceDays(String(settings.overdue_grace_days));
    setServiceDescription(settings.service_description);
    setInterestRatePercent(
      settings.interest_rate_percent != null ? String(settings.interest_rate_percent) : '',
    );
    setEarlyPaymentDiscountPercent(
      settings.early_payment_discount_percent != null
        ? String(settings.early_payment_discount_percent)
        : '',
    );
    setFineMode(settings.fine_type ?? 'off');
    setFineRatePercent(
      settings.fine_rate_percent != null ? String(settings.fine_rate_percent) : '',
    );
    setFineAmount(
      settings.fine_amount_cents != null ? formatCentsInput(String(settings.fine_amount_cents)) : '',
    );
  }, []);

  useEffect(() => {
    if (!schoolId) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        applySettings(await fetchBillingSettings(schoolId));
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : t('billingSettings.loadError'),
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [applySettings, schoolId, t]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!schoolId) {
      return;
    }

    setSaving(true);
    setError('');
    setFieldErrors({});
    setSaved(false);

    const payload: BillingSettingsPayload = {
      overdue_grace_days: Number(overdueGraceDays),
      service_description: serviceDescription.trim(),
      interest_rate_percent: parseOptionalPercent(interestRatePercent),
      early_payment_discount_percent: parseOptionalPercent(earlyPaymentDiscountPercent),
      fine_type: fineMode === 'off' ? '' : fineMode,
      fine_rate_percent: fineMode === 'percent' ? parseOptionalPercent(fineRatePercent) : null,
      fine_amount_cents:
        fineMode === 'fixed' && fineAmount.trim()
          ? parseCents(fineAmount)
          : null,
    };

    try {
      applySettings(await updateBillingSettings(schoolId, payload));
      setSaved(true);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'validation_error') {
        const details = err.details as Record<string, string[]>;
        const mapped = Object.fromEntries(
          Object.entries(details).map(([key, messages]) => [key, messages[0] ?? '']),
        );
        setFieldErrors(mapped);
        setError(t('billingSettings.validationError'));
      } else {
        setError(err instanceof ApiError ? err.message : t('billingSettings.saveError'));
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Stack spacing={3} component="form" onSubmit={submit}>
      <PageHeader
        title={t('billingSettings.title')}
        subtitle={t('billingSettings.description')}
      />

      {error ? <ErrorBanner message={error} /> : null}
      {saved ? (
        <Typography variant="body2" color="success.main">
          {t('billingSettings.saved')}
        </Typography>
      ) : null}

      <SectionCard title={t('billingSettings.sections.general')}>
        <Stack spacing={2}>
          <TextField
            label={t('billingSettings.overdueGraceDays')}
            type="number"
            inputProps={{ min: 0, max: 30 }}
            value={overdueGraceDays}
            onChange={(event) => setOverdueGraceDays(event.target.value)}
            helperText={t('billingSettings.overdueGraceDaysHelp')}
            error={Boolean(fieldErrors.overdue_grace_days)}
          />
          <TextField
            label={t('billingSettings.serviceDescription')}
            value={serviceDescription}
            onChange={(event) => setServiceDescription(event.target.value)}
            inputProps={{ maxLength: 100 }}
            helperText={t('billingSettings.serviceDescriptionHelp')}
            error={Boolean(fieldErrors.service_description)}
          />
          <TextField
            label={t('billingSettings.interestRatePercent')}
            value={interestRatePercent}
            onChange={(event) => setInterestRatePercent(event.target.value)}
            InputProps={{
              endAdornment: <InputAdornment position="end">%</InputAdornment>,
            }}
            helperText={t('billingSettings.interestRatePercentHelp')}
            error={Boolean(fieldErrors.interest_rate_percent)}
          />
        </Stack>
      </SectionCard>

      <SectionCard title={t('billingSettings.sections.earlyPayment')}>
        <TextField
          label={t('billingSettings.earlyPaymentDiscountPercent')}
          value={earlyPaymentDiscountPercent}
          onChange={(event) => setEarlyPaymentDiscountPercent(event.target.value)}
          InputProps={{
            endAdornment: <InputAdornment position="end">%</InputAdornment>,
          }}
          helperText={t('billingSettings.earlyPaymentDiscountPercentHelp')}
          error={Boolean(fieldErrors.early_payment_discount_percent)}
        />
      </SectionCard>

      <SectionCard title={t('billingSettings.sections.fine')}>
        <FormControl component="fieldset">
          <RadioGroup
            value={fineMode}
            onChange={(event) => setFineMode(event.target.value as FineMode)}
          >
            <FormControlLabel
              value="off"
              control={<Radio />}
              label={t('billingSettings.fineOff')}
            />
            <FormControlLabel
              value="percent"
              control={<Radio />}
              label={t('billingSettings.finePercent')}
            />
            <FormControlLabel
              value="fixed"
              control={<Radio />}
              label={t('billingSettings.fineFixed')}
            />
          </RadioGroup>
          {fieldErrors.fine_type ? (
            <FormHelperText error>{fieldErrors.fine_type}</FormHelperText>
          ) : null}
        </FormControl>

        {fineMode === 'percent' ? (
          <TextField
            sx={{ mt: 2 }}
            label={t('billingSettings.fineRatePercent')}
            value={fineRatePercent}
            onChange={(event) => setFineRatePercent(event.target.value)}
            InputProps={{
              endAdornment: <InputAdornment position="end">%</InputAdornment>,
            }}
            error={Boolean(fieldErrors.fine_rate_percent)}
            helperText={fieldErrors.fine_rate_percent}
          />
        ) : null}

        {fineMode === 'fixed' ? (
          <TextField
            sx={{ mt: 2 }}
            label={t('billingSettings.fineAmount')}
            value={fineAmount}
            onChange={(event) => setFineAmount(event.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start">R$</InputAdornment>,
            }}
            error={Boolean(fieldErrors.fine_amount_cents)}
            helperText={fieldErrors.fine_amount_cents}
          />
        ) : null}
      </SectionCard>

      <Box>
        <Button type="submit" variant="contained" disabled={saving || !schoolId}>
          {saving ? <CircularProgress size={24} color="inherit" /> : t('common.save')}
        </Button>
      </Box>
    </Stack>
  );
};

export default BillingSettingsPage;
