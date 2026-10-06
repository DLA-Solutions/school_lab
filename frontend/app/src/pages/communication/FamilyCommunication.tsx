import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import Box from '@mui/material/Box';
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
import { useTranslation } from 'providers/I18nContext';
import { useGuardianSchool } from 'providers/useGuardianSchool';
import { ApiError } from 'services/api';
import { listConversations, listDestinations, sendMessage } from 'services/communicationApi';
import { listNotifications } from 'services/notificationsApi';
import { listMyStudents } from 'services/studentsApi';
import { CommunicationDestination, Conversation, ConversationAudience } from 'types/communication';
import { Student } from 'types/student';
import type { MessageKey } from 'locales';

const AUDIENCE_ORDER: Record<ConversationAudience, number> = {
  coordination: 0,
  secretary: 1,
  teacher: 2,
};

const AUDIENCE_LABEL: Record<Exclude<ConversationAudience, 'teacher'>, MessageKey> = {
  coordination: 'communication.audience.coordination',
  secretary: 'communication.audience.secretary',
};

type FamilySelection =
  | { kind: 'thread'; conversationId: number }
  | { kind: 'new'; audience: ConversationAudience; teacherId: number | null };

const destinationLabel = (
  destination: CommunicationDestination,
  t: (key: MessageKey) => string,
) => {
  if (destination.audience === 'teacher') {
    return destination.name ?? t('communication.audience.teacher');
  }

  return t(AUDIENCE_LABEL[destination.audience]);
};

const sameDestination = (
  conversation: Conversation,
  audience: ConversationAudience,
  teacherId: number | null,
) =>
  conversation.audience === audience && (conversation.teacher_id ?? null) === (teacherId ?? null);

const byRecent = (left: Conversation, right: Conversation) => {
  const leftTime = left.last_message_at ? Date.parse(left.last_message_at) : 0;
  const rightTime = right.last_message_at ? Date.parse(right.last_message_at) : 0;
  return rightTime - leftTime;
};

/**
 * Family chat at `/comunicacao`.
 *
 * The inbox is every conversation that already has messages. Destinations that do not yet
 * have a thread stay in the list so the family can write first. A child selector appears
 * only when this guardian has more than one child.
 */
const FamilyCommunication = () => {
  const { t } = useTranslation();
  const school = useGuardianSchool();
  const schoolId = school?.school_id ?? null;
  const [searchParams] = useSearchParams();
  const linkedId = Number(searchParams.get('conversation_id')) || null;

  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [destinations, setDestinations] = useState<CommunicationDestination[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [notices, setNotices] = useState<UnreadMessageNotice[]>([]);
  const [selection, setSelection] = useState<FamilySelection | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const inbox = conversations
    .filter((conversation) => studentId == null || conversation.student_id === studentId)
    .sort(byRecent);

  const openConversation =
    selection?.kind === 'thread'
      ? (conversations.find((conversation) => conversation.id === selection.conversationId) ?? null)
      : selection?.kind === 'new' && studentId != null
        ? (conversations.find(
            (conversation) =>
              conversation.student_id === studentId &&
              sameDestination(conversation, selection.audience, selection.teacherId),
          ) ?? null)
        : null;

  const openConversationId =
    selection?.kind === 'thread' ? selection.conversationId : (openConversation?.id ?? null);

  const thread = useThreadMessages(schoolId, openConversationId);
  useMarkOpenConversationRead(notices, setNotices, openConversationId);
  const unreadIds = new Set(notices.map((notice) => notice.conversationId));

  const load = useCallback(async () => {
    if (!schoolId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [studentsResponse, conversationsResponse, notificationResponse] = await Promise.all([
        listMyStudents(schoolId),
        listConversations(schoolId),
        listNotifications(),
      ]);
      const nextStudents = studentsResponse.data;
      const nextConversations = conversationsResponse.data;
      const linked = linkedId ? nextConversations.find((item) => item.id === linkedId) : undefined;

      setStudents(nextStudents);
      setConversations(nextConversations);
      setNotices(unreadMessageNotices(notificationResponse.data));
      setStudentId((current) => {
        if (linked && nextStudents.some((student) => student.id === linked.student_id)) {
          return linked.student_id;
        }
        if (current && nextStudents.some((student) => student.id === current)) {
          return current;
        }
        return nextStudents[0]?.id ?? null;
      });
      if (linked) {
        setSelection({ kind: 'thread', conversationId: linked.id });
      }
    } catch (err) {
      setStudents([]);
      setConversations([]);
      setNotices([]);
      setError(err instanceof ApiError ? err.message : t('communication.loadError'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, linkedId, t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!schoolId || studentId == null) {
      return;
    }

    let cancelled = false;

    const loadDestinations = async () => {
      try {
        const response = await listDestinations(schoolId, studentId);
        if (!cancelled) {
          setDestinations(response.data);
          setError('');
        }
      } catch (err) {
        if (!cancelled) {
          setDestinations([]);
          setError(err instanceof ApiError ? err.message : t('communication.loadError'));
        }
      }
    };

    loadDestinations();

    return () => {
      cancelled = true;
    };
  }, [schoolId, studentId, t]);

  const orderedDestinations = [...destinations].sort(
    (left, right) => AUDIENCE_ORDER[left.audience] - AUDIENCE_ORDER[right.audience],
  );

  const freshDestinations = orderedDestinations.filter(
    (destination) =>
      studentId == null ||
      !conversations.some(
        (conversation) =>
          conversation.student_id === studentId &&
          sameDestination(conversation, destination.audience, destination.teacher_id),
      ),
  );

  const whoLabel = (() => {
    if (selection?.kind === 'new') {
      const destination = orderedDestinations.find(
        (item) =>
          item.audience === selection.audience &&
          (item.teacher_id ?? null) === (selection.teacherId ?? null),
      );
      return destination ? destinationLabel(destination, t) : '';
    }

    if (!openConversation) {
      return '';
    }

    if (openConversation.audience === 'teacher') {
      return (
        openConversation.teacher_name ??
        destinations.find((item) => item.teacher_id === openConversation.teacher_id)?.name ??
        t('communication.audience.teacher')
      );
    }

    return t(AUDIENCE_LABEL[openConversation.audience]);
  })();

  const childName =
    students.find((student) => student.id === studentId)?.name ??
    openConversation?.student_name ??
    '';

  const heading =
    selection && whoLabel && childName
      ? t('communication.thread.withDestination', { who: whoLabel, child: childName })
      : null;

  const handleSend = async () => {
    if (!schoolId || studentId == null || !selection) {
      return;
    }

    const body = draft.trim();
    if (!body) {
      return;
    }

    const audience = selection.kind === 'thread' ? openConversation?.audience : selection.audience;
    const teacherId =
      selection.kind === 'thread' ? openConversation?.teacher_id : selection.teacherId;
    if (!audience) {
      return;
    }

    setSending(true);
    setError('');

    try {
      const sent = await sendMessage(schoolId, {
        student_id: studentId,
        audience,
        teacher_id: audience === 'teacher' ? teacherId : undefined,
        body,
      });
      setDraft('');
      thread.rememberSent(sent.conversation_id, sent.message);
      setSelection({ kind: 'thread', conversationId: sent.conversation_id });
      setConversations((current) => {
        const teacherName =
          audience === 'teacher'
            ? (current.find((item) => item.id === sent.conversation_id)?.teacher_name ??
              destinations.find((item) => item.teacher_id === teacherId)?.name ??
              null)
            : null;
        const next = {
          id: sent.conversation_id,
          student_id: studentId,
          student_name: students.find((student) => student.id === studentId)?.name ?? '',
          audience,
          teacher_id: teacherId ?? null,
          teacher_name: teacherName,
          last_message_at: sent.message.sent_at,
          last_message_body: sent.message.body,
          school_class_id:
            current.find((item) => item.id === sent.conversation_id)?.school_class_id ?? null,
          sender_line: sent.message.sender_line,
        };

        if (current.some((item) => item.id === sent.conversation_id)) {
          return current.map((item) =>
            item.id === sent.conversation_id ? { ...item, ...next } : item,
          );
        }

        return [...current, next];
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

  const pageError = error || thread.error;
  const unreadLabel = t('communication.unread');
  const showChild = students.length > 1;

  return (
    <Stack direction="column" gap={3.5}>
      <PageHeader
        title={t('communication.title')}
        actions={
          students.length > 1 ? (
            <TextField
              id="communication-child"
              label={t('communication.child')}
              value={studentId == null ? '' : String(studentId)}
              onChange={(event) => {
                setStudentId(Number(event.target.value));
                setSelection(null);
                setDraft('');
              }}
              variant="filled"
              size="small"
              select
              sx={{ minWidth: 220 }}
            >
              {students.map((student) => (
                <MenuItem key={student.id} value={String(student.id)}>
                  {student.name}
                </MenuItem>
              ))}
            </TextField>
          ) : undefined
        }
      />

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
        ) : students.length === 0 ? (
          <EmptyState
            title={t('communication.empty.children.title')}
            description={t('communication.empty.children.description')}
          />
        ) : (
          <ChatColumns
            threadOpen={selection != null}
            onBack={() => setSelection(null)}
            backLabel={t('communication.back')}
            list={
              <>
                <Typography variant="subtitle2">{t('communication.inbox.heading')}</Typography>
                {inbox.length === 0 ? (
                  <EmptyState
                    title={t('communication.empty.inbox.title')}
                    description={t('communication.empty.inbox.description')}
                  />
                ) : (
                  inbox.map((conversation) => {
                    const label =
                      conversation.audience === 'teacher'
                        ? (conversation.teacher_name ??
                          destinations.find((item) => item.teacher_id === conversation.teacher_id)
                            ?.name ??
                          t('communication.audience.teacher'))
                        : t(AUDIENCE_LABEL[conversation.audience]);

                    return (
                      <ConversationRow
                        key={conversation.id}
                        label={label}
                        detail={showChild ? conversation.student_name : null}
                        preview={conversation.last_message_body}
                        sentAt={conversation.last_message_at}
                        selected={
                          selection?.kind === 'thread' &&
                          selection.conversationId === conversation.id
                        }
                        unreadLabel={unreadIds.has(conversation.id) ? unreadLabel : null}
                        onClick={() => {
                          setStudentId(conversation.student_id);
                          setSelection({ kind: 'thread', conversationId: conversation.id });
                          setDraft('');
                        }}
                      />
                    );
                  })
                )}

                {freshDestinations.length > 0 && (
                  <>
                    <Typography variant="subtitle2">{t('communication.start.heading')}</Typography>
                    {freshDestinations.map((destination) => {
                      const label = destinationLabel(destination, t);
                      const selected =
                        selection?.kind === 'new' &&
                        selection.audience === destination.audience &&
                        (selection.teacherId ?? null) === (destination.teacher_id ?? null);

                      return (
                        <ConversationRow
                          key={`${destination.audience}:${destination.teacher_id ?? ''}`}
                          label={label}
                          selected={selected}
                          onClick={() => {
                            setSelection({
                              kind: 'new',
                              audience: destination.audience,
                              teacherId: destination.teacher_id,
                            });
                            setDraft('');
                          }}
                        />
                      );
                    })}
                  </>
                )}
              </>
            }
            thread={
              selection ? (
                <MessageThread
                  heading={heading}
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

export default FamilyCommunication;
