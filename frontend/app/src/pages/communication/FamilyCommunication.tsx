import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { EmptyState, ErrorBanner, PageHeader, SectionCard } from 'design-system';
import ChatColumns from 'components/sections/communication/ChatColumns';
import MessageThread from 'components/sections/communication/MessageThread';
import { useThreadMessages } from 'components/sections/communication/useThreadMessages';
import { useTranslation } from 'providers/I18nContext';
import { useGuardianSchool } from 'providers/useGuardianSchool';
import { ApiError } from 'services/api';
import { listConversations, listDestinations, sendMessage } from 'services/communicationApi';
import { listMyStudents } from 'services/studentsApi';
import {
  CommunicationDestination,
  Conversation,
  ConversationAudience,
} from 'types/communication';
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

interface DestinationSelection {
  audience: ConversationAudience;
  teacherId: number | null;
}

const destinationLabel = (
  destination: CommunicationDestination,
  t: (key: MessageKey) => string,
) => {
  if (destination.audience === 'teacher') {
    return destination.name ?? '';
  }

  return t(AUDIENCE_LABEL[destination.audience]);
};

const sameDestination = (destination: CommunicationDestination, selection: DestinationSelection) =>
  destination.audience === selection.audience &&
  (destination.teacher_id ?? null) === (selection.teacherId ?? null);

const matchingConversation = (
  conversations: Conversation[],
  studentId: number,
  selection: DestinationSelection,
) =>
  conversations.find(
    (conversation) =>
      conversation.student_id === studentId &&
      conversation.audience === selection.audience &&
      (conversation.teacher_id ?? null) === (selection.teacherId ?? null),
  );

/**
 * Family chat at `/comunicacao`. The list is coordination, secretary, and one row per teacher.
 * A child selector appears only when this guardian has more than one child.
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
  const [selection, setSelection] = useState<DestinationSelection | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const conversation =
    studentId != null && selection
      ? matchingConversation(conversations, studentId, selection) ?? null
      : null;
  const thread = useThreadMessages(schoolId, conversation?.id ?? null);

  const load = useCallback(async () => {
    if (!schoolId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [studentsResponse, conversationsResponse] = await Promise.all([
        listMyStudents(schoolId),
        listConversations(schoolId),
      ]);
      const nextStudents = studentsResponse.data;
      const nextConversations = conversationsResponse.data;
      const linked = linkedId
        ? nextConversations.find((item) => item.id === linkedId)
        : undefined;

      setStudents(nextStudents);
      setConversations(nextConversations);
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
        setSelection({ audience: linked.audience, teacherId: linked.teacher_id });
      }
    } catch (err) {
      setStudents([]);
      setConversations([]);
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

  const handleSend = async () => {
    if (!schoolId || studentId == null || !selection) {
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
        student_id: studentId,
        audience: selection.audience,
        teacher_id: selection.audience === 'teacher' ? selection.teacherId : undefined,
        body,
      });
      setDraft('');
      thread.rememberSent(sent.conversation_id, sent.message);
      setConversations((current) => {
        if (current.some((item) => item.id === sent.conversation_id)) {
          return current;
        }

        return [
          ...current,
          {
            id: sent.conversation_id,
            student_id: studentId,
            audience: selection.audience,
            teacher_id: selection.teacherId,
            last_message_at: sent.message.sent_at,
            school_class_id: null,
            sender_line: '',
          },
        ];
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
              orderedDestinations.length === 0 ? (
                <EmptyState
                  title={t('communication.empty.inbox.title')}
                  description={t('communication.empty.inbox.description')}
                />
              ) : (
                orderedDestinations.map((destination) => {
                  const label = destinationLabel(destination, t);
                  const selected = selection != null && sameDestination(destination, selection);

                  return (
                    <Box
                      key={`${destination.audience}:${destination.teacher_id ?? ''}`}
                      component="button"
                      type="button"
                      aria-current={selected ? 'true' : undefined}
                      onClick={() => {
                        setSelection({
                          audience: destination.audience,
                          teacherId: destination.teacher_id,
                        });
                        setDraft('');
                      }}
                      sx={{
                        textAlign: 'left',
                        border: 0,
                        cursor: 'pointer',
                        px: 1.5,
                        py: 1.25,
                        borderRadius: 1,
                        bgcolor: selected ? 'surface.alt' : 'transparent',
                        color: 'text.primary',
                        font: 'inherit',
                      }}
                    >
                      {label}
                    </Box>
                  );
                })
              )
            }
            thread={
              selection ? (
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

export default FamilyCommunication;
