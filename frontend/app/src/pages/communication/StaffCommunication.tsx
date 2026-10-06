import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { EmptyState, ErrorBanner, PageHeader, SectionCard } from 'design-system';
import ChatColumns from 'components/sections/communication/ChatColumns';
import ConversationRow from 'components/sections/communication/ConversationRow';
import MessageThread from 'components/sections/communication/MessageThread';
import { useThreadMessages } from 'components/sections/communication/useThreadMessages';
import {
  unreadMessageNotices,
  UnreadMessageNotice,
  useMarkOpenConversationRead,
} from 'components/sections/communication/useUnreadMessages';
import type { MessageKey } from 'locales';
import { useTranslation } from 'providers/I18nContext';
import { useCurrentSchool } from 'providers/useCurrentSchool';
import { listSchoolClasses } from 'services/academicsApi';
import { ApiError } from 'services/api';
import { listConversations, listRoster, sendMessage } from 'services/communicationApi';
import { listNotifications } from 'services/notificationsApi';
import { SchoolClass } from 'types/academics';
import {
  CommunicationDestination,
  CommunicationRosterItem,
  Conversation,
  ConversationAudience,
} from 'types/communication';
import { schoolClassLabel } from 'utils/schoolClassLabel';

type InboxScope = 'mine' | 'all';

type OpenThread =
  | { source: 'inbox'; conversationId: number }
  | { source: 'roster'; studentId: number; destinationKey: string | null };

const AUDIENCE_ORDER: Record<ConversationAudience, number> = {
  coordination: 0,
  secretary: 1,
  teacher: 2,
};

const AUDIENCE_LABEL: Record<Exclude<ConversationAudience, 'teacher'>, MessageKey> = {
  coordination: 'communication.audience.coordination',
  secretary: 'communication.audience.secretary',
};

const destinationKeyOf = (audience: ConversationAudience, teacherId: number | null) =>
  `${audience}:${teacherId ?? ''}`;

const destinationLabel = (
  destination: CommunicationDestination,
  t: (key: MessageKey) => string,
) => {
  if (destination.audience === 'teacher') {
    return destination.name ?? t('communication.audience.teacher');
  }

  return t(AUDIENCE_LABEL[destination.audience]);
};

const channelLabel = (
  audience: ConversationAudience,
  teacherName: string | null,
  t: (key: MessageKey) => string,
) => {
  if (audience === 'teacher') {
    return teacherName || t('communication.audience.teacher');
  }

  return t(AUDIENCE_LABEL[audience]);
};

const chooseClassId = (list: SchoolClass[], current: number | null, preferred: number | null) => {
  if (current != null && list.some((item) => item.id === current)) {
    return current;
  }
  if (preferred != null && list.some((item) => item.id === preferred)) {
    return preferred;
  }

  return list[0]?.id ?? null;
};

const sameDestination = (conversation: Conversation, destination: CommunicationDestination) =>
  conversation.audience === destination.audience &&
  (conversation.teacher_id ?? null) === (destination.teacher_id ?? null);

const byRecent = (left: Conversation, right: Conversation) => {
  const leftTime = left.last_message_at ? Date.parse(left.last_message_at) : 0;
  const rightTime = right.last_message_at ? Date.parse(right.last_message_at) : 0;
  return rightTime - leftTime;
};

/**
 * School chat at `/academico/comunicacao`.
 *
 * The inbox is every conversation that already has messages (all pages). The class roster is
 * how this person writes first. A teacher, the secretary, and coordination on "For me" already
 * know their channel. Coordination's "All" list and direction see every conversation, and
 * direction still picks a destination before the first send.
 */
const StaffCommunication = () => {
  const { t } = useTranslation();
  const school = useCurrentSchool();
  const schoolId = school?.school_id ?? null;
  const systemKey = school?.role_template?.system_key ?? null;
  const isTeacher = school?.role === 'teacher';
  const isCoordination = !isTeacher && systemKey === 'coordination';
  const isDirector = !isTeacher && systemKey === 'director';
  const [searchParams] = useSearchParams();
  const linkedId = Number(searchParams.get('conversation_id')) || null;

  const [scope, setScope] = useState<InboxScope>('mine');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [notices, setNotices] = useState<UnreadMessageNotice[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classId, setClassId] = useState<number | null>(null);
  const [roster, setRoster] = useState<CommunicationRosterItem[]>([]);
  const [open, setOpen] = useState<OpenThread | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [classesLoading, setClassesLoading] = useState(true);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [rosterLoading, setRosterLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [widenedForLink, setWidenedForLink] = useState(false);
  const linkApplied = useRef(false);
  const audienceRef = useRef<ConversationAudience | undefined>(
    isCoordination ? 'coordination' : undefined,
  );

  const audienceFilter: ConversationAudience | undefined =
    isCoordination && scope === 'mine' ? 'coordination' : undefined;

  const impliedAudience = (): ConversationAudience => {
    if (isTeacher) {
      return 'teacher';
    }
    if (isCoordination) {
      return 'coordination';
    }

    return 'secretary';
  };

  const selectedStudentId = open?.source === 'roster' ? open.studentId : null;
  const destinationKey = open?.source === 'roster' ? open.destinationKey : null;
  const selectedRow = roster.find((item) => item.student_id === selectedStudentId) ?? null;
  const orderedDestinations = [...(selectedRow?.destinations ?? [])].sort(
    (left, right) => AUDIENCE_ORDER[left.audience] - AUDIENCE_ORDER[right.audience],
  );
  const selectedDestination =
    orderedDestinations.find(
      (item) => destinationKeyOf(item.audience, item.teacher_id) === destinationKey,
    ) ?? null;
  const selectedConversation =
    open?.source === 'inbox'
      ? (conversations.find((item) => item.id === open.conversationId) ?? null)
      : null;

  const rosterThreadId = (() => {
    if (!selectedRow) {
      return null;
    }
    if (isDirector) {
      if (!selectedDestination) {
        return null;
      }

      return (
        conversations.find(
          (item) =>
            item.student_id === selectedRow.student_id &&
            sameDestination(item, selectedDestination),
        )?.id ?? null
      );
    }

    const audience = impliedAudience();
    return (
      conversations.find(
        (item) =>
          item.student_id === selectedRow.student_id &&
          item.audience === audience &&
          (audience !== 'teacher' ||
            (item.teacher_id ?? null) === (selectedRow.teacher_id ?? null)),
      )?.id ?? null
    );
  })();

  const threadConversationId = open?.source === 'inbox' ? open.conversationId : rosterThreadId;
  const thread = useThreadMessages(schoolId, threadConversationId);
  useMarkOpenConversationRead(notices, setNotices, threadConversationId);
  const unreadIds = new Set(notices.map((notice) => notice.conversationId));

  const showThread =
    open != null && (open.source === 'inbox' ? selectedConversation != null : selectedRow != null);
  const sendEnabled = !isDirector || open?.source !== 'roster' || selectedDestination != null;

  useEffect(() => {
    if (!classesLoading && !conversationsLoading) {
      setReady(true);
    }
  }, [classesLoading, conversationsLoading]);

  useEffect(() => {
    if (!schoolId) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setClassesLoading(true);
      setError('');

      try {
        const [classResponse, notificationResponse] = await Promise.all([
          listSchoolClasses(schoolId, isTeacher ? { assignment: 'teaching' } : {}),
          listNotifications(),
        ]);
        if (cancelled) {
          return;
        }

        setClasses(classResponse.data);
        setClassId((current) => chooseClassId(classResponse.data, current, null));
        setNotices(unreadMessageNotices(notificationResponse.data));
      } catch (err) {
        if (!cancelled) {
          setClasses([]);
          setNotices([]);
          setError(err instanceof ApiError ? err.message : t('communication.loadError'));
        }
      } finally {
        if (!cancelled) {
          setClassesLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [schoolId, isTeacher, reloadKey, t]);

  useEffect(() => {
    if (!schoolId) {
      return;
    }

    let cancelled = false;
    const audienceChanged = audienceRef.current !== audienceFilter;
    audienceRef.current = audienceFilter;

    const load = async () => {
      setConversationsLoading(true);
      if (audienceChanged) {
        setConversations([]);
      }

      try {
        const response = await listConversations(schoolId, audienceFilter);
        if (!cancelled) {
          setConversations(response.data);
          setError('');
        }
      } catch (err) {
        if (!cancelled) {
          setConversations([]);
          setError(err instanceof ApiError ? err.message : t('communication.loadError'));
        }
      } finally {
        if (!cancelled) {
          setConversationsLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [schoolId, audienceFilter, reloadKey, t]);

  useEffect(() => {
    if (!schoolId) {
      setRosterLoading(false);
      return;
    }

    if (classId == null) {
      if (!classesLoading) {
        setRoster([]);
        setRosterLoading(false);
      }
      return;
    }

    let cancelled = false;

    const loadRoster = async () => {
      setRosterLoading(true);

      try {
        const response = await listRoster(schoolId, classId);
        if (!cancelled) {
          setRoster(response.data);
          setError('');
        }
      } catch (err) {
        if (!cancelled) {
          setRoster([]);
          setError(err instanceof ApiError ? err.message : t('communication.loadError'));
        }
      } finally {
        if (!cancelled) {
          setRosterLoading(false);
        }
      }
    };

    loadRoster();

    return () => {
      cancelled = true;
    };
  }, [schoolId, classId, classesLoading, reloadKey, t]);

  useEffect(() => {
    if (linkApplied.current || linkedId == null || conversationsLoading || classesLoading) {
      return;
    }

    const match = conversations.find((item) => item.id === linkedId);
    if (!match) {
      if (isCoordination && scope === 'mine' && !widenedForLink) {
        setWidenedForLink(true);
        setScope('all');
      }
      return;
    }

    if (
      isCoordination &&
      scope === 'mine' &&
      match.audience !== 'coordination' &&
      !widenedForLink
    ) {
      setWidenedForLink(true);
      setScope('all');
      return;
    }

    linkApplied.current = true;
    setOpen({ source: 'inbox', conversationId: match.id });
    if (
      match.school_class_id != null &&
      classes.some((item) => item.id === match.school_class_id)
    ) {
      setClassId(match.school_class_id);
    }
  }, [
    classes,
    classesLoading,
    conversations,
    conversationsLoading,
    linkedId,
    isCoordination,
    scope,
    widenedForLink,
  ]);

  const handleSend = async () => {
    if (!schoolId || sending) {
      return;
    }

    const body = draft.trim();
    if (!body) {
      return;
    }

    let studentId: number | undefined;
    let studentName = '';
    let audience: ConversationAudience;
    let teacherId: number | null | undefined;
    let teacherName: string | null = null;

    if (open?.source === 'inbox' && selectedConversation) {
      studentId = selectedConversation.student_id;
      studentName = selectedConversation.student_name;
      audience = selectedConversation.audience;
      teacherId =
        selectedConversation.audience === 'teacher' ? selectedConversation.teacher_id : undefined;
      teacherName = selectedConversation.teacher_name;
    } else if (open?.source === 'roster' && selectedRow) {
      studentId = selectedRow.student_id;
      studentName = selectedRow.student_name;
      if (isDirector) {
        if (!selectedDestination) {
          return;
        }
        audience = selectedDestination.audience;
        teacherId =
          selectedDestination.audience === 'teacher' ? selectedDestination.teacher_id : undefined;
        teacherName = selectedDestination.audience === 'teacher' ? selectedDestination.name : null;
      } else {
        audience = impliedAudience();
        teacherId = audience === 'teacher' ? selectedRow.teacher_id : undefined;
      }
    } else {
      return;
    }

    if (studentId == null) {
      return;
    }

    setSending(true);
    setError('');

    try {
      const sent = await sendMessage(schoolId, {
        student_id: studentId,
        audience,
        teacher_id: teacherId ?? undefined,
        body,
      });
      setDraft('');
      thread.rememberSent(sent.conversation_id, sent.message);
      setOpen({ source: 'inbox', conversationId: sent.conversation_id });
      setConversations((current) => {
        const existing = current.find((item) => item.id === sent.conversation_id);
        const next: Conversation = {
          id: sent.conversation_id,
          student_id: studentId,
          student_name: studentName,
          audience,
          teacher_id: audience === 'teacher' ? (teacherId ?? null) : null,
          teacher_name: teacherName,
          last_message_at: sent.message.sent_at,
          last_message_body: sent.message.body,
          school_class_id: existing?.school_class_id ?? classId,
          // The inbox line is the family, which this send does not return. Keep the one we
          // already had, or the child's name until the list is loaded again.
          sender_line: existing?.sender_line || studentName,
        };
        if (existing) {
          return current.map((item) =>
            item.id === sent.conversation_id ? { ...item, ...next } : item,
          );
        }

        return [next, ...current];
      });
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

  const audience = impliedAudience();
  const starters = roster.filter((row) => {
    if (isDirector) {
      return true;
    }

    return !conversations.some(
      (conversation) =>
        conversation.student_id === row.student_id &&
        conversation.audience === audience &&
        (audience !== 'teacher' || (conversation.teacher_id ?? null) === (row.teacher_id ?? null)),
    );
  });

  const inbox = [...conversations].sort(byRecent);
  const severalChildren = new Set(inbox.map((conversation) => conversation.student_id)).size > 1;
  const showChannel = isDirector || (isCoordination && scope === 'all');

  const heading = (() => {
    if (open?.source === 'inbox' && selectedConversation) {
      return t('communication.thread.asChannel', {
        channel: channelLabel(selectedConversation.audience, selectedConversation.teacher_name, t),
        child: selectedConversation.student_name,
      });
    }

    if (open?.source === 'roster' && selectedRow) {
      if (isDirector && !selectedDestination) {
        return t('communication.thread.pickDestination', { child: selectedRow.student_name });
      }

      const channel =
        isDirector && selectedDestination
          ? destinationLabel(selectedDestination, t)
          : channelLabel(
              audience,
              conversations.find(
                (conversation) =>
                  conversation.student_id === selectedRow.student_id &&
                  conversation.audience === 'teacher',
              )?.teacher_name ?? null,
              t,
            );

      return t('communication.thread.asChannel', {
        channel,
        child: selectedRow.student_name,
      });
    }

    return null;
  })();

  const pageError = error || thread.error;
  const unreadLabel = t('communication.unread');
  const bootLoading = !ready;

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader title={t('communication.title')} />

      {pageError && (
        <ErrorBanner
          message={pageError}
          onRetry={thread.error && !error ? thread.retry : () => setReloadKey((key) => key + 1)}
          retryLabel={t('common.tryAgain')}
        />
      )}

      <SectionCard>
        {bootLoading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        ) : (
          <ChatColumns
            threadOpen={showThread}
            onBack={() => {
              setOpen(null);
              setDraft('');
            }}
            backLabel={t('communication.back')}
            list={
              <>
                {isCoordination && (
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant={scope === 'mine' ? 'contained' : 'outlined'}
                      onClick={() => {
                        setScope('mine');
                        setOpen(null);
                        setDraft('');
                      }}
                    >
                      {t('communication.scope.forMe')}
                    </Button>
                    <Button
                      size="small"
                      variant={scope === 'all' ? 'contained' : 'outlined'}
                      onClick={() => {
                        setScope('all');
                        setOpen(null);
                        setDraft('');
                      }}
                    >
                      {t('communication.scope.all')}
                    </Button>
                  </Stack>
                )}

                <Typography variant="subtitle2">{t('communication.inbox.heading')}</Typography>
                {conversationsLoading ? (
                  <Box display="flex" justifyContent="center" py={2}>
                    <CircularProgress size={24} />
                  </Box>
                ) : inbox.length === 0 ? (
                  <EmptyState
                    title={t('communication.empty.inbox.title')}
                    description={t('communication.empty.staffInbox.description')}
                  />
                ) : (
                  inbox.map((conversation) => {
                    const detailParts = [
                      severalChildren ? conversation.student_name : null,
                      showChannel
                        ? channelLabel(conversation.audience, conversation.teacher_name, t)
                        : null,
                    ].filter((part): part is string => Boolean(part));

                    return (
                      <ConversationRow
                        key={conversation.id}
                        label={conversation.sender_line || conversation.student_name}
                        detail={detailParts.length > 0 ? detailParts.join(' · ') : null}
                        preview={conversation.last_message_body}
                        sentAt={conversation.last_message_at}
                        selected={
                          open?.source === 'inbox' && open.conversationId === conversation.id
                        }
                        unreadLabel={unreadIds.has(conversation.id) ? unreadLabel : null}
                        onClick={() => {
                          setOpen({ source: 'inbox', conversationId: conversation.id });
                          setDraft('');
                        }}
                      />
                    );
                  })
                )}

                <Typography variant="subtitle2">{t('communication.start.heading')}</Typography>
                {classes.length > 0 && (
                  <TextField
                    id="communication-class"
                    label={t('communication.class')}
                    value={classId == null ? '' : String(classId)}
                    onChange={(event) => {
                      setClassId(Number(event.target.value));
                      setOpen((current) => (current?.source === 'roster' ? null : current));
                      setDraft('');
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

                {rosterLoading ? (
                  <Box display="flex" justifyContent="center" py={4}>
                    <CircularProgress size={24} />
                  </Box>
                ) : classId != null && roster.length === 0 ? (
                  <EmptyState
                    title={t('communication.empty.roster.title')}
                    description={t('communication.empty.roster.description')}
                  />
                ) : (
                  starters.map((row) => (
                    <ConversationRow
                      key={row.student_id}
                      label={row.student_name}
                      selected={open?.source === 'roster' && open.studentId === row.student_id}
                      onClick={() => {
                        setOpen({
                          source: 'roster',
                          studentId: row.student_id,
                          destinationKey: null,
                        });
                        setDraft('');
                      }}
                    />
                  ))
                )}
              </>
            }
            thread={
              showThread ? (
                <Stack direction="column" spacing={1.5} sx={{ flex: 1, minHeight: 0 }}>
                  {isDirector && open?.source === 'roster' && (
                    <TextField
                      id="communication-destination"
                      label={t('communication.destination')}
                      value={destinationKey ?? ''}
                      onChange={(event) => {
                        const nextKey = event.target.value || null;
                        setOpen((current) =>
                          current?.source === 'roster'
                            ? { ...current, destinationKey: nextKey }
                            : current,
                        );
                      }}
                      variant="filled"
                      size="small"
                      select
                      fullWidth
                    >
                      <MenuItem value="" sx={{ display: 'none' }} />
                      {orderedDestinations.map((destination) => (
                        <MenuItem
                          key={destinationKeyOf(destination.audience, destination.teacher_id)}
                          value={destinationKeyOf(destination.audience, destination.teacher_id)}
                        >
                          {destinationLabel(destination, t)}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                  <MessageThread
                    heading={heading}
                    messages={thread.messages}
                    loading={thread.loading}
                    membershipId={school.id}
                    draft={draft}
                    sending={sending}
                    sendEnabled={sendEnabled}
                    sendDisabledReason={
                      sendEnabled ? null : t('communication.sendDisabled.destination')
                    }
                    onDraftChange={setDraft}
                    onSend={handleSend}
                  />
                </Stack>
              ) : (
                <EmptyState
                  title={t('communication.empty.selectStudent.title')}
                  description={t('communication.empty.selectStudent.description')}
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
