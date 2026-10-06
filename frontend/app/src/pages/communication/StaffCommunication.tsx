import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { EmptyState, ErrorBanner, PageHeader, SectionCard, SemanticChip } from 'design-system';
import ChatColumns from 'components/sections/communication/ChatColumns';
import MessageThread from 'components/sections/communication/MessageThread';
import { useThreadMessages } from 'components/sections/communication/useThreadMessages';
import { useTranslation } from 'providers/I18nContext';
import { useCurrentSchool } from 'providers/useCurrentSchool';
import { listSchoolClasses } from 'services/academicsApi';
import { ApiError } from 'services/api';
import { listConversations, sendMessage } from 'services/communicationApi';
import { listNotifications } from 'services/notificationsApi';
import { SchoolClass } from 'types/academics';
import { Conversation } from 'types/communication';
import { schoolClassLabel } from 'utils/schoolClassLabel';

type InboxScope = 'mine' | 'all';

/**
 * School inbox at `/academico/comunicacao`. Each row is the guardian line the API already
 * composed. A teacher with more than one class picks it above the list; coordination switches
 * between "For me" and every conversation; direction only has the full list.
 */
const StaffCommunication = () => {
  const { t } = useTranslation();
  const school = useCurrentSchool();
  const schoolId = school?.school_id ?? null;
  const systemKey = school?.role_template?.system_key ?? null;
  const isTeacher = school?.role === 'teacher';
  const isCoordination = systemKey === 'coordination';
  const isDirector = systemKey === 'director';
  const [searchParams] = useSearchParams();
  const linkedId = Number(searchParams.get('conversation_id')) || null;

  const [scope, setScope] = useState<InboxScope>(isDirector ? 'all' : 'mine');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [unreadIds, setUnreadIds] = useState<Set<number>>(new Set());
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classId, setClassId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [widenedForLink, setWidenedForLink] = useState(false);
  const linkApplied = useRef(false);

  const audienceFilter = isCoordination && scope === 'mine' ? 'coordination' : undefined;
  const thread = useThreadMessages(schoolId, selectedId);

  const load = useCallback(async () => {
    if (!schoolId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [conversationResponse, notificationResponse] = await Promise.all([
        listConversations(schoolId, audienceFilter),
        listNotifications(),
      ]);
      setConversations(conversationResponse.data);
      setUnreadIds(
        new Set(
          notificationResponse.data
            .filter(
              (notification) =>
                notification.kind === 'message' &&
                !notification.read &&
                notification.conversation_id != null,
            )
            .map((notification) => notification.conversation_id as number),
        ),
      );
    } catch (err) {
      setConversations([]);
      setUnreadIds(new Set());
      setError(err instanceof ApiError ? err.message : t('communication.loadError'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, audienceFilter, t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!schoolId || !isTeacher) {
      return;
    }

    let cancelled = false;

    const loadClasses = async () => {
      try {
        const response = await listSchoolClasses(schoolId, { mine: true });
        if (cancelled) {
          return;
        }
        setClasses(response.data);
        setClassId((current) => {
          if (current && response.data.some((schoolClass) => schoolClass.id === current)) {
            return current;
          }
          return response.data[0]?.id ?? null;
        });
      } catch (err) {
        if (!cancelled) {
          setClasses([]);
          setError(err instanceof ApiError ? err.message : t('communication.loadError'));
        }
      }
    };

    loadClasses();

    return () => {
      cancelled = true;
    };
  }, [schoolId, isTeacher, t]);

  useEffect(() => {
    if (linkApplied.current || linkedId == null || loading) {
      return;
    }

    const match = conversations.find((conversation) => conversation.id === linkedId);
    if (!match) {
      if (isCoordination && scope === 'mine' && !widenedForLink) {
        setWidenedForLink(true);
        setScope('all');
      }
      return;
    }

    linkApplied.current = true;
    setSelectedId(match.id);
    if (match.school_class_id != null) {
      setClassId(match.school_class_id);
    }
  }, [conversations, linkedId, loading, isCoordination, scope, widenedForLink]);

  const rows = useMemo(() => {
    if (!isTeacher || classes.length < 2 || classId == null) {
      return conversations;
    }

    return conversations.filter((conversation) => conversation.school_class_id === classId);
  }, [conversations, isTeacher, classes.length, classId]);

  const selected = conversations.find((conversation) => conversation.id === selectedId) ?? null;

  const handleSend = async () => {
    if (!schoolId || !selected) {
      return;
    }

    const body = draft.trim();
    if (!body) {
      return;
    }

    setSending(true);
    setError('');

    try {
      const sent = await sendMessage(schoolId, {
        student_id: selected.student_id,
        audience: selected.audience,
        teacher_id: selected.audience === 'teacher' ? selected.teacher_id : undefined,
        body,
      });
      setDraft('');
      thread.rememberSent(sent.conversation_id, sent.message);
      setSelectedId(sent.conversation_id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('communication.sendError'));
    } finally {
      setSending(false);
    }
  };

  if (!school) {
    return (
      <Stack direction="column" gap={3.5}>
        <PageHeader title={t('communication.title')} />
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

  const pageError = error || thread.error;

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader title={t('communication.title')} />

      {pageError && (
        <ErrorBanner
          message={pageError}
          onRetry={thread.error ? thread.retry : load}
          retryLabel={t('common.tryAgain')}
        />
      )}

      <SectionCard>
        {loading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        ) : (
          <ChatColumns
            threadOpen={selectedId != null}
            onBack={() => setSelectedId(null)}
            backLabel={t('communication.back')}
            list={
              <>
                {isCoordination && (
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant={scope === 'mine' ? 'contained' : 'outlined'}
                      onClick={() => setScope('mine')}
                    >
                      {t('communication.scope.forMe')}
                    </Button>
                    <Button
                      size="small"
                      variant={scope === 'all' ? 'contained' : 'outlined'}
                      onClick={() => setScope('all')}
                    >
                      {t('communication.scope.all')}
                    </Button>
                  </Stack>
                )}

                {isTeacher && classes.length > 1 && (
                  <TextField
                    id="communication-class"
                    label={t('communication.class')}
                    value={classId == null ? '' : String(classId)}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      setClassId(next);
                      setSelectedId((current) => {
                        const still = conversations.find(
                          (conversation) =>
                            conversation.id === current && conversation.school_class_id === next,
                        );
                        return still ? current : null;
                      });
                    }}
                    variant="filled"
                    size="small"
                    select
                    fullWidth
                  >
                    {classes.map((schoolClass) => (
                      <MenuItem key={schoolClass.id} value={String(schoolClass.id)}>
                        {schoolClassLabel(schoolClass, t)}
                      </MenuItem>
                    ))}
                  </TextField>
                )}

                {rows.length === 0 ? (
                  <EmptyState
                    title={t('communication.empty.inbox.title')}
                    description={t('communication.empty.inbox.description')}
                  />
                ) : (
                  rows.map((conversation) => {
                    const selectedRow = conversation.id === selectedId;
                    const unread = unreadIds.has(conversation.id);

                    return (
                      <Box
                        key={conversation.id}
                        component="button"
                        type="button"
                        aria-current={selectedRow ? 'true' : undefined}
                        onClick={() => {
                          setSelectedId(conversation.id);
                          setDraft('');
                        }}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 1,
                          textAlign: 'left',
                          border: 0,
                          cursor: 'pointer',
                          px: 1.5,
                          py: 1.25,
                          borderRadius: 1,
                          bgcolor: selectedRow ? 'surface.alt' : 'transparent',
                          color: 'text.primary',
                          font: 'inherit',
                        }}
                      >
                        <Typography variant="body2" sx={{ whiteSpace: 'normal' }}>
                          {conversation.sender_line}
                        </Typography>
                        {unread && (
                          <SemanticChip variant="info" label={t('communication.unread')} />
                        )}
                      </Box>
                    );
                  })
                )}
              </>
            }
            thread={
              selected ? (
                <MessageThread
                  messages={thread.messages}
                  loading={thread.loading}
                  membershipId={school.id}
                  draft={draft}
                  sending={sending}
                  onDraftChange={setDraft}
                  onSend={handleSend}
                />
              ) : (
                <EmptyState
                  title={t('communication.empty.select.title')}
                  description={t('communication.empty.select.description')}
                />
              )
            }
          />
        )}
      </SectionCard>
    </Stack>
  );
};

export default StaffCommunication;
