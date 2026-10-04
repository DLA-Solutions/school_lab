import { useCallback, useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useSearchParams } from 'react-router';
import MessageComposer from 'components/sections/communication/MessageComposer';
import ThreadTranscript from 'components/sections/communication/ThreadTranscript';
import { EmptyState, ErrorBanner, PageHeader, SectionCard, SuccessBanner } from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { useGuardianSchool } from 'providers/useGuardianSchool';
import { listThreads, postMessage } from 'services/communicationApi';
import { FamilyThread } from 'types/communication';
import { communicationErrorText } from 'utils/communicationError';

/**
 * One inbox for the family. A routine card is read inside the thread, and the reply stays there.
 */
const MyMessages = () => {
  const { t } = useTranslation();
  const school = useGuardianSchool();
  const schoolId = school?.school_id ?? null;
  const [params, setParams] = useSearchParams();
  const selectedId = Number(params.get('student_id')) || null;

  const [threads, setThreads] = useState<FamilyThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [threadVersion, setThreadVersion] = useState(0);

  const load = useCallback(async () => {
    if (!schoolId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      setThreads(await listThreads(schoolId, 'guardian'));
    } catch (err) {
      setThreads([]);
      setError(communicationErrorText(err, t, 'communication.loadError'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, t]);

  useEffect(() => {
    load();
  }, [load]);

  const selected = threads.find((thread) => thread.student_id === selectedId) ?? null;

  if (!school) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title={t('nav.myMessages')} />
        <SectionCard>
          <EmptyState
            title={t('common.noAccess.title')}
            description={t('myMessages.noAccess.description')}
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader title={t('nav.myMessages')} subtitle={t('myMessages.subtitle')} />
      {error && <ErrorBanner message={error} />}
      {notice && <SuccessBanner message={notice} />}

      <SectionCard title={t('myMessages.list.title')}>
        {loading ? (
          <Stack alignItems="center" py={4}>
            <CircularProgress />
          </Stack>
        ) : threads.length === 0 ? (
          <EmptyState
            title={t('myMessages.empty.title')}
            description={t('myMessages.empty.description')}
            headingLevel={3}
          />
        ) : (
          <Stack direction="column" gap={1}>
            {threads.map((thread) => (
              <Button
                key={thread.student_id}
                variant={thread.student_id === selectedId ? 'contained' : 'text'}
                onClick={() => setParams({ student_id: String(thread.student_id) })}
                sx={{ justifyContent: 'flex-start' }}
              >
                {thread.student_name}
              </Button>
            ))}
          </Stack>
        )}
      </SectionCard>

      {selected && (
        <SectionCard title={selected.student_name}>
          <Stack direction="column" gap={2}>
            <ThreadTranscript
              key={`${selected.student_id}-${threadVersion}`}
              schoolId={school.school_id}
              studentId={selected.student_id}
              audience="guardian"
              membershipId={school.id}
            />
            <MessageComposer
              schoolId={school.school_id}
              audience="guardian"
              placeholder={t('myMessages.compose.placeholder')}
              submitLabel={t('communication.compose.send')}
              onSend={async ({ body, attachmentIds, clientRequestId }) => {
                await postMessage(school.school_id, selected.student_id, 'guardian', {
                  body,
                  attachmentIds,
                  clientRequestId,
                });
                setNotice(t('communication.sent'));
                setThreadVersion((version) => version + 1);
              }}
            />
          </Stack>
        </SectionCard>
      )}

      {!selected && !loading && threads.length > 0 && (
        <Typography variant="body2" color="text.secondary">
          {t('myMessages.choose')}
        </Typography>
      )}
    </Stack>
  );
};

export default MyMessages;
