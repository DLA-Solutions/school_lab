import { useCallback, useEffect, useMemo, useState } from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useSearchParams } from 'react-router';
import MessageComposer from 'components/sections/communication/MessageComposer';
import ThreadTranscript from 'components/sections/communication/ThreadTranscript';
import { EmptyState, ErrorBanner, PageHeader, SectionCard, SuccessBanner } from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { useCurrentSchool } from 'providers/useCurrentSchool';
import { listAllSchoolClasses } from 'services/academicsApi';
import { listThreads, postClassNotice, postMessage } from 'services/communicationApi';
import { SchoolClass } from 'types/academics';
import { FamilyThread } from 'types/communication';
import { communicationErrorText } from 'utils/communicationError';
import { schoolClassLabel } from 'utils/schoolClassLabel';

/**
 * The teacher's side of the family thread: one child at a time, plus a class notice that
 * copies the same text into each child's thread. Coordination does not get this composer.
 */
const Messages = () => {
  const { t } = useTranslation();
  const school = useCurrentSchool();
  const schoolId = school?.school_id ?? null;
  const isTeacher = school?.role === 'teacher';
  const [params, setParams] = useSearchParams();
  const selectedId = Number(params.get('student_id')) || null;

  const [threads, setThreads] = useState<FamilyThread[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classId, setClassId] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [threadVersion, setThreadVersion] = useState(0);

  const load = useCallback(async () => {
    if (!schoolId || !isTeacher) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [children, allClasses] = await Promise.all([
        listThreads(schoolId, 'teacher'),
        listAllSchoolClasses(schoolId),
      ]);
      // `school_classes?mine=true` is the grade book (class disciplines). A family thread
      // follows a teaching assignment, so the notice only offers classes those children are in.
      const taught = new Set(children.map((thread) => thread.school_class_id));
      const mine = allClasses.filter((schoolClass) => taught.has(schoolClass.id));
      setThreads(children);
      setClasses(mine);
      setClassId((current) => current || mine[0]?.id || '');
    } catch (err) {
      setThreads([]);
      setError(communicationErrorText(err, t, 'communication.loadError'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, isTeacher, t]);

  useEffect(() => {
    load();
  }, [load]);

  const className = useMemo(() => {
    const byId = new Map(classes.map((schoolClass) => [schoolClass.id, schoolClass]));
    return (id: number | null) => {
      if (!id) return '';
      const schoolClass = byId.get(id);
      return schoolClass ? schoolClassLabel(schoolClass, t) : '';
    };
  }, [classes, t]);

  const selected = threads.find((thread) => thread.student_id === selectedId) ?? null;

  const openThread = (studentId: number) => {
    setParams({ student_id: String(studentId) });
  };

  if (!school || !isTeacher) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title={t('nav.messages')} />
        <SectionCard>
          <EmptyState
            title={t('common.noAccess.title')}
            description={t('communication.noAccess.description')}
            headingLevel={2}
          />
        </SectionCard>
      </Stack>
    );
  }

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader title={t('nav.messages')} subtitle={t('communication.subtitle')} />
      {error && <ErrorBanner message={error} />}
      {notice && <SuccessBanner message={notice} />}

      <SectionCard title={t('communication.list.title')}>
        {loading ? (
          <Stack alignItems="center" py={4}>
            <CircularProgress />
          </Stack>
        ) : threads.length === 0 ? (
          <EmptyState
            title={t('communication.empty.title')}
            description={t('communication.empty.description')}
            headingLevel={3}
          />
        ) : (
          <Stack direction="column" gap={1}>
            {threads.map((thread) => (
              <Button
                key={thread.student_id}
                variant={thread.student_id === selectedId ? 'contained' : 'text'}
                onClick={() => openThread(thread.student_id)}
                sx={{ justifyContent: 'space-between' }}
              >
                <span>
                  {thread.student_name}
                  {className(thread.school_class_id) ? ` — ${className(thread.school_class_id)}` : ''}
                </span>
                {!thread.conversation_id && (
                  <Typography component="span" variant="caption">
                    {t('communication.noThread')}
                  </Typography>
                )}
              </Button>
            ))}
          </Stack>
        )}
      </SectionCard>

      {selected && (
        <SectionCard title={t('communication.thread.title', { name: selected.student_name })}>
          <Stack direction="column" gap={2}>
            <ThreadTranscript
              key={`${selected.student_id}-${threadVersion}`}
              schoolId={school.school_id}
              studentId={selected.student_id}
              audience="teacher"
              membershipId={school.id}
            />
            <MessageComposer
              schoolId={school.school_id}
              audience="teacher"
              placeholder={t('communication.compose.placeholder')}
              submitLabel={t('communication.compose.send')}
              onSend={async ({ body, attachmentIds, clientRequestId }) => {
                await postMessage(school.school_id, selected.student_id, 'teacher', {
                  body,
                  attachmentIds,
                  clientRequestId,
                });
                setNotice(t('communication.sent'));
                setThreadVersion((version) => version + 1);
                await load();
              }}
            />
          </Stack>
        </SectionCard>
      )}

      <SectionCard title={t('communication.classNotice.title')}>
        <Stack direction="column" gap={2}>
          <Typography variant="body2" color="text.secondary">
            {t('communication.classNotice.description')}
          </Typography>
          {classes.length === 0 ? (
            <EmptyState
              title={t('communication.classNotice.empty.title')}
              description={t('communication.classNotice.empty.description')}
              headingLevel={3}
            />
          ) : (
            <>
              <TextField
                select
                label={t('communication.classNotice.class')}
                value={classId}
                onChange={(event) => setClassId(Number(event.target.value))}
              >
                {classes.map((schoolClass) => (
                  <MenuItem key={schoolClass.id} value={schoolClass.id}>
                    {schoolClassLabel(schoolClass, t)}
                  </MenuItem>
                ))}
              </TextField>
              {classId !== '' && (
                <MessageComposer
                  schoolId={school.school_id}
                  audience="teacher"
                  placeholder={t('communication.classNotice.placeholder')}
                  submitLabel={t('communication.classNotice.send')}
                  onSend={async ({ body, attachmentIds, clientRequestId }) => {
                    await postClassNotice(school.school_id, {
                      schoolClassId: classId,
                      body,
                      attachmentIds,
                      clientRequestId,
                    });
                    setNotice(t('communication.classNotice.sent'));
                    setThreadVersion((version) => version + 1);
                    await load();
                  }}
                />
              )}
            </>
          )}
        </Stack>
      </SectionCard>
    </Stack>
  );
};

export default Messages;
