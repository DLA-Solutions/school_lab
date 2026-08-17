import { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {
  EmptyState,
  ErrorBanner,
  PageHeader,
  SectionCard,
  SemanticChip,
  SuccessBanner,
} from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { useCurrentSchool } from 'providers/useCurrentSchool';
import { listSchoolClasses } from 'services/academicsApi';
import { ApiError } from 'services/api';
import {
  getReportCardConfig,
  publishReportCardBatch,
  republishReportCard,
  updateReportCardConfig,
  validateReportCardBatch,
} from 'services/reportCardsApi';
import { SchoolClass } from 'types/academics';
import {
  ReportCardBatch,
  ReportCardBlocker,
  ReportCardConfig,
  ReportCardValidateResult,
} from 'types/reportCard';

type TabValue = 'config' | 'publish' | 'republish';

const formatBlockers = (blockers: ReportCardBlocker[]) =>
  blockers.map((blocker) => {
    const student = blocker.student_id ? `#${blocker.student_id}` : '—';
    return `${student}: ${blocker.code}`;
  });

/**
 * Staff report card workflow: school display config, class batch validate/publish, and audited
 * republish for one student/period.
 */
const ReportCards = () => {
  const { t } = useTranslation();
  const school = useCurrentSchool();
  const schoolId = school?.school_id ?? null;

  const [tab, setTab] = useState<TabValue>('config');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [config, setConfig] = useState<ReportCardConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [templateKey, setTemplateKey] = useState('');
  const [headerText, setHeaderText] = useState('');
  const [footerText, setFooterText] = useState('');
  const [signatoryId, setSignatoryId] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classId, setClassId] = useState('');
  const [periodId, setPeriodId] = useState('');
  const [validating, setValidating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [validation, setValidation] = useState<ReportCardValidateResult | null>(null);
  const [batch, setBatch] = useState<ReportCardBatch | null>(null);

  const [publicationId, setPublicationId] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [republishing, setRepublishing] = useState(false);

  const loadConfig = useCallback(async () => {
    if (!schoolId) {
      return;
    }

    setConfigLoading(true);
    setError('');

    try {
      const current = await getReportCardConfig(schoolId);
      setConfig(current);
      setTemplateKey(current.template_key);
      setHeaderText(current.header_text ?? '');
      setFooterText(current.footer_text ?? '');
      setSignatoryId(String(current.document_signatory_id));
    } catch (err) {
      setConfig(null);
      if (err instanceof ApiError && err.status === 404) {
        setError('');
      } else {
        setError(err instanceof ApiError ? err.message : t('reportCards.config.loadError'));
      }
    } finally {
      setConfigLoading(false);
    }
  }, [schoolId, t]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (!schoolId) {
      return;
    }

    const loadClasses = async () => {
      try {
        const response = await listSchoolClasses(schoolId);
        setClasses(response.data);
      } catch {
        setClasses([]);
      }
    };

    loadClasses();
  }, [schoolId]);

  const batchInput = () => ({
    class_id: Number(classId),
    academic_period_id: Number(periodId),
  });

  const handleSaveConfig = async () => {
    if (!schoolId) {
      return;
    }

    setSavingConfig(true);
    setError('');
    setNotice('');

    try {
      const updated = await updateReportCardConfig(schoolId, {
        template_key: templateKey,
        header_text: headerText || null,
        footer_text: footerText || null,
        document_signatory_id: Number(signatoryId),
      });
      setConfig(updated);
      setNotice(t('reportCards.config.saved'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('reportCards.config.saveError'));
    } finally {
      setSavingConfig(false);
    }
  };

  const handleValidate = async () => {
    if (!schoolId || !classId || !periodId) {
      return;
    }

    setValidating(true);
    setError('');
    setNotice('');
    setValidation(null);
    setBatch(null);

    try {
      const result = await validateReportCardBatch(schoolId, batchInput());
      setValidation(result);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'report_card_not_ready') {
        setValidation({
          class_id: Number(classId),
          academic_period_id: Number(periodId),
          ready: false,
          blockers: (err.details.blockers as ReportCardBlocker[] | undefined) ?? [],
        });
      } else {
        setError(err instanceof ApiError ? err.message : t('reportCards.publish.validateError'));
      }
    } finally {
      setValidating(false);
    }
  };

  const handlePublish = async () => {
    if (!schoolId || !classId || !periodId) {
      return;
    }

    setPublishing(true);
    setError('');
    setNotice('');
    setBatch(null);

    try {
      const result = await publishReportCardBatch(schoolId, batchInput());
      setBatch(result);
      setNotice(t('reportCards.publish.success'));
    } catch (err) {
      if (err instanceof ApiError && err.code === 'report_card_not_ready') {
        setValidation({
          class_id: Number(classId),
          academic_period_id: Number(periodId),
          ready: false,
          blockers: (err.details.blockers as ReportCardBlocker[] | undefined) ?? [],
        });
      } else {
        setError(err instanceof ApiError ? err.message : t('reportCards.publish.error'));
      }
    } finally {
      setPublishing(false);
    }
  };

  const handleRepublish = async () => {
    if (!schoolId || !publicationId || !correctionReason.trim()) {
      return;
    }

    setRepublishing(true);
    setError('');
    setNotice('');

    try {
      const result = await republishReportCard(
        schoolId,
        Number(publicationId),
        correctionReason.trim(),
      );
      setNotice(
        t('reportCards.republish.success', {
          version: String(result.version),
        }),
      );
      setCorrectionReason('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('reportCards.republish.error'));
    } finally {
      setRepublishing(false);
    }
  };

  if (!school) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title={t('nav.reportCards')} />
        <SectionCard>
          <EmptyState
            title={t('common.noAccess.title')}
            description={t('reportCards.noAccess.description')}
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader title={t('nav.reportCards')} />

      {error && <ErrorBanner message={error} />}
      {notice && <SuccessBanner message={notice} />}

      <SectionCard>
        <Tabs value={tab} onChange={(_, value: TabValue) => setTab(value)}>
          <Tab value="config" label={t('reportCards.tab.config')} />
          <Tab value="publish" label={t('reportCards.tab.publish')} />
          <Tab value="republish" label={t('reportCards.tab.republish')} />
        </Tabs>

        {tab === 'config' && (
          <Stack direction="column" gap={2} mt={2}>
            {configLoading ? (
              <Stack alignItems="center" py={4}>
                <CircularProgress size={28} />
              </Stack>
            ) : (
              <>
                {config && (
                  <Typography variant="body2" color="text.secondary">
                    {t('reportCards.config.version', { version: String(config.version) })}
                  </Typography>
                )}

                <TextField
                  label={t('reportCards.config.templateKey')}
                  value={templateKey}
                  onChange={(event) => setTemplateKey(event.target.value)}
                  variant="filled"
                  size="small"
                  fullWidth
                />
                <TextField
                  label={t('reportCards.config.headerText')}
                  value={headerText}
                  onChange={(event) => setHeaderText(event.target.value)}
                  variant="filled"
                  size="small"
                  fullWidth
                  multiline
                  minRows={2}
                />
                <TextField
                  label={t('reportCards.config.footerText')}
                  value={footerText}
                  onChange={(event) => setFooterText(event.target.value)}
                  variant="filled"
                  size="small"
                  fullWidth
                  multiline
                  minRows={2}
                />
                <TextField
                  label={t('reportCards.config.signatoryId')}
                  value={signatoryId}
                  onChange={(event) => setSignatoryId(event.target.value)}
                  variant="filled"
                  size="small"
                  fullWidth
                  type="number"
                />

                <Box>
                  <Button
                    variant="contained"
                    onClick={handleSaveConfig}
                    disabled={savingConfig || !templateKey || !signatoryId}
                  >
                    {savingConfig ? t('reportCards.config.saving') : t('reportCards.config.save')}
                  </Button>
                </Box>
              </>
            )}
          </Stack>
        )}

        {tab === 'publish' && (
          <Stack direction="column" gap={2} mt={2}>
            <TextField
              id="report-cards-class"
              label={t('reportCards.publish.class')}
              value={classId}
              onChange={(event) => setClassId(event.target.value)}
              variant="filled"
              size="small"
              select
              fullWidth
            >
              {classes.map((schoolClass) => (
                <MenuItem key={schoolClass.id} value={String(schoolClass.id)}>
                  {schoolClass.name} ({schoolClass.year})
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label={t('reportCards.publish.periodId')}
              value={periodId}
              onChange={(event) => setPeriodId(event.target.value)}
              variant="filled"
              size="small"
              fullWidth
              type="number"
            />

            <Stack direction="row" gap={1.5} flexWrap="wrap">
              <Button
                variant="outlined"
                onClick={handleValidate}
                disabled={validating || !classId || !periodId}
              >
                {validating ? t('reportCards.publish.validating') : t('reportCards.publish.validate')}
              </Button>
              <Button
                variant="contained"
                onClick={handlePublish}
                disabled={publishing || !classId || !periodId}
              >
                {publishing ? t('reportCards.publish.publishing') : t('reportCards.publish.action')}
              </Button>
            </Stack>

            {validation && (
              <Stack direction="column" gap={1}>
                <SemanticChip
                  variant={validation.ready ? 'success' : 'error'}
                  label={
                    validation.ready
                      ? t('reportCards.publish.ready')
                      : t('reportCards.publish.notReady')
                  }
                />
                {validation.blockers.length > 0 && (
                  <Typography variant="body2" color="text.secondary" component="div">
                    {formatBlockers(validation.blockers).map((line) => (
                      <div key={line}>{line}</div>
                    ))}
                  </Typography>
                )}
              </Stack>
            )}

            {batch && (
              <Stack direction="column" gap={1} divider={<Divider />}>
                <Typography variant="subtitle2">
                  {t('reportCards.publish.batchStatus', { status: batch.status })}
                </Typography>
                {batch.results.map((result) => (
                  <Typography key={result.snapshot_id} variant="body2" color="text.secondary">
                    {t('reportCards.publish.resultLine', {
                      studentId: String(result.student_id),
                      publicationId: String(result.publication_id),
                      version: String(result.version),
                    })}
                  </Typography>
                ))}
              </Stack>
            )}
          </Stack>
        )}

        {tab === 'republish' && (
          <Stack direction="column" gap={2} mt={2}>
            <Typography variant="body2" color="text.secondary">
              {t('reportCards.republish.description')}
            </Typography>

            <TextField
              label={t('reportCards.republish.publicationId')}
              value={publicationId}
              onChange={(event) => setPublicationId(event.target.value)}
              variant="filled"
              size="small"
              fullWidth
              type="number"
            />
            <TextField
              label={t('reportCards.republish.reason')}
              value={correctionReason}
              onChange={(event) => setCorrectionReason(event.target.value)}
              variant="filled"
              size="small"
              fullWidth
              multiline
              minRows={3}
              required
            />

            <Box>
              <Button
                variant="contained"
                onClick={handleRepublish}
                disabled={republishing || !publicationId || !correctionReason.trim()}
              >
                {republishing ? t('reportCards.republish.working') : t('reportCards.republish.action')}
              </Button>
            </Box>
          </Stack>
        )}
      </SectionCard>
    </Stack>
  );
};

export default ReportCards;
