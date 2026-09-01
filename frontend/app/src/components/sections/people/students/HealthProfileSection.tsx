import { FormEvent, useCallback, useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ErrorBanner, SuccessBanner } from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { ApiError } from 'services/api';
import {
  BloodType,
  StudentHealthProfile,
  getHealthProfile,
  saveHealthProfile,
} from 'services/healthRecordsApi';

const MAX_NOTES_LENGTH = 2000;

const BLOOD_TYPES: BloodType[] = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
  'unknown',
];

export interface HealthProfileSectionProps {
  schoolId: number;
  studentId: number;
  asGuardian?: boolean;
  readOnly?: boolean;
  onSaved?: () => void;
}

const HealthProfileSection = ({
  schoolId,
  studentId,
  asGuardian = false,
  readOnly = false,
  onSaved,
}: HealthProfileSectionProps) => {
  const { t } = useTranslation();

  const [profile, setProfile] = useState<StudentHealthProfile | null>(null);
  const [bloodType, setBloodType] = useState<BloodType | ''>('');
  const [healthPlanName, setHealthPlanName] = useState('');
  const [healthPlanNumber, setHealthPlanNumber] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [specialCareNotes, setSpecialCareNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const applyProfile = (data: StudentHealthProfile) => {
    setProfile(data);
    setBloodType(data.blood_type ?? '');
    setHealthPlanName(data.health_plan_name ?? '');
    setHealthPlanNumber(data.health_plan_number ?? '');
    setEmergencyContactName(data.emergency_contact_name ?? '');
    setEmergencyContactPhone(data.emergency_contact_phone ?? '');
    setSpecialCareNotes(data.special_care_notes ?? '');
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setSaved(false);

    try {
      const data = await getHealthProfile(schoolId, studentId, { asGuardian });
      applyProfile(data);
    } catch (err) {
      setProfile(null);
      setError(err instanceof ApiError ? err.message : t('health.profile.loadError'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, studentId, asGuardian, t]);

  useEffect(() => {
    load();
  }, [load]);

  const notesTooLong = specialCareNotes.length > MAX_NOTES_LENGTH;

  const dirty =
    profile !== null &&
    (bloodType !== (profile.blood_type ?? '') ||
      healthPlanName !== (profile.health_plan_name ?? '') ||
      healthPlanNumber !== (profile.health_plan_number ?? '') ||
      emergencyContactName !== (profile.emergency_contact_name ?? '') ||
      emergencyContactPhone !== (profile.emergency_contact_phone ?? '') ||
      specialCareNotes !== (profile.special_care_notes ?? ''));

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();

    if (readOnly || !asGuardian) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      const data = await saveHealthProfile(schoolId, studentId, {
        blood_type: bloodType || null,
        health_plan_name: healthPlanName || null,
        health_plan_number: healthPlanNumber || null,
        emergency_contact_name: emergencyContactName || null,
        emergency_contact_phone: emergencyContactPhone || null,
        special_care_notes: specialCareNotes || null,
      });
      applyProfile(data);
      setSaved(true);
      onSaved?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('health.profile.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const disabled = readOnly || saving || profile === null;

  return (
    <Stack direction="column" gap={2}>
      <Typography variant="subtitle2">{t('health.profile.title')}</Typography>

      {error && (
        <ErrorBanner message={error} onRetry={load} retryLabel={t('common.tryAgain')} />
      )}
      {saved && <SuccessBanner message={t('health.profile.saved')} />}

      {loading ? (
        <Stack alignItems="center" py={4}>
          <CircularProgress size={28} />
        </Stack>
      ) : (
        <Stack
          component="form"
          onSubmit={handleSave}
          direction="column"
          gap={2}
          noValidate
        >
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                fullWidth
                id="health-profile-blood-type"
                label={t('health.profile.bloodType')}
                value={bloodType}
                onChange={(event) => {
                  setBloodType(event.target.value as BloodType | '');
                  setSaved(false);
                }}
                disabled={disabled}
              >
                <MenuItem value="">{t('health.profile.bloodTypeUnknown')}</MenuItem>
                {BLOOD_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type === 'unknown' ? t('health.profile.bloodTypeUnknown') : type}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                id="health-profile-plan-name"
                label={t('health.profile.healthPlanName')}
                value={healthPlanName}
                onChange={(event) => {
                  setHealthPlanName(event.target.value);
                  setSaved(false);
                }}
                disabled={disabled}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                id="health-profile-plan-number"
                label={t('health.profile.healthPlanNumber')}
                value={healthPlanNumber}
                onChange={(event) => {
                  setHealthPlanNumber(event.target.value);
                  setSaved(false);
                }}
                disabled={disabled}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                id="health-profile-emergency-name"
                label={t('health.profile.emergencyContactName')}
                value={emergencyContactName}
                onChange={(event) => {
                  setEmergencyContactName(event.target.value);
                  setSaved(false);
                }}
                disabled={disabled}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                id="health-profile-emergency-phone"
                label={t('health.profile.emergencyContactPhone')}
                value={emergencyContactPhone}
                onChange={(event) => {
                  setEmergencyContactPhone(event.target.value);
                  setSaved(false);
                }}
                disabled={disabled}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                id="health-profile-special-care"
                label={t('health.profile.specialCareNotes')}
                value={specialCareNotes}
                onChange={(event) => {
                  setSpecialCareNotes(event.target.value);
                  setSaved(false);
                }}
                multiline
                minRows={3}
                disabled={disabled}
                error={notesTooLong}
                helperText={
                  notesTooLong
                    ? t('health.profile.notesTooLong', { limit: String(MAX_NOTES_LENGTH) })
                    : `${specialCareNotes.length}/${MAX_NOTES_LENGTH}`
                }
              />
            </Grid>
          </Grid>

          {!readOnly && asGuardian && (
            <Button
              type="submit"
              variant="contained"
              disabled={saving || !dirty || notesTooLong}
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
              sx={{ alignSelf: 'flex-start' }}
            >
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          )}
        </Stack>
      )}
    </Stack>
  );
};

export default HealthProfileSection;
