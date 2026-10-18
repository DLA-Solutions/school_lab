import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  PageHeader,
  SearchField,
  SectionCard,
} from 'design-system';
import { CHAT_PANEL_HEIGHT_PX } from 'components/sections/communication/chatPanelLayout';
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
import {
  listConversations,
  listRoster,
  searchRoster,
  sendMessage,
} from 'services/communicationApi';
import { listNotifications } from 'services/notificationsApi';
import { SchoolClass } from 'types/academics';
import {
  CommunicationDestination,
  CommunicationRosterItem,
  Conversation,
  ConversationAudience,
} from 'types/communication';
import { schoolClassLabel } from 'utils/schoolClassLabel';
import { useDebouncedValue } from 'utils/useDebouncedValue';

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

const GUARDIAN_RELATIONSHIP_LABEL: Record<'father' | 'mother' | 'other', MessageKey> = {
  father: 'students.relationship.father',
  mother: 'students.relationship.mother',
  other: 'students.relationship.other',
};

/**
 * "Mãe: Mariana Barbosa · Pai: Carlos Barbosa" — only `/search` rows carry `guardians`, so a
 * `/roster` row (or a student with no kept guardian) renders no detail line at all.
 */
const guardianDetail = (row: CommunicationRosterItem, t: (key: MessageKey) => string) => {
  if (!row.guardians || row.guardians.length === 0) {
    return null;
  }

  return row.guardians
    .map((guardian) => `${t(GUARDIAN_RELATIONSHIP_LABEL[guardian.relationship])}: ${guardian.name}`)
    .join(' · ');
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

/** Replace the row a send just touched, or prepend it when the conversation is brand new. */
const mergeConversation = (current: Conversation[], next: Conversation): Conversation[] => {
  const existing = current.find((item) => item.id === next.id);
  if (existing) {
    return current.map((item) => (item.id === next.id ? { ...item, ...next } : item));
  }

  return [next, ...current];
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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CommunicationRosterItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [open, setOpen] = useState<OpenThread | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [starterOpen, setStarterOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkDraft, setBulkDraft] = useState('');
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
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
  // Tracks the previous `isSearching` value so the reset effect below fires only on the
  // false -> true transition (entering search), not on every render while it stays true.
  const wasSearchingRef = useRef(false);

  const audienceFilter: ConversationAudience | undefined =
    isCoordination && scope === 'mine' ? 'coordination' : undefined;

  const debouncedSearchQuery = useDebouncedValue(searchQuery);
  const trimmedSearchQuery = debouncedSearchQuery.trim();
  // A type-ahead, not a form field: under 2 characters stays on the Turma-filtered roster below
  // instead of calling the search endpoint (it would just answer `[]` anyway).
  const isSearching = trimmedSearchQuery.length >= 2;

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
  // A search hit is just another roster row — once opened it stays reachable even if a later
  // keystroke replaces `searchResults`, or the query is cleared back to the Turma-filtered list.
  const selectedRow =
    roster.find((item) => item.student_id === selectedStudentId) ??
    searchResults.find((item) => item.student_id === selectedStudentId) ??
    null;
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
    if (!schoolId || !isSearching) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    let cancelled = false;

    const search = async () => {
      setSearchLoading(true);

      try {
        const response = await searchRoster(schoolId, trimmedSearchQuery);
        if (!cancelled) {
          setSearchResults(response.data);
          setError('');
        }
      } catch (err) {
        if (!cancelled) {
          setSearchResults([]);
          setError(err instanceof ApiError ? err.message : t('communication.loadError'));
        }
      } finally {
        if (!cancelled) {
          setSearchLoading(false);
        }
      }
    };

    search();

    return () => {
      cancelled = true;
    };
  }, [schoolId, isSearching, trimmedSearchQuery, t]);

  // Bug fix: entering search mode must drop whatever thread `open` was pointing at. The right
  // panel always reads `open`, but the "Conversas" box swaps from `inbox` to `searchResults`
  // the moment `isSearching` flips true — without this, the header/thread could keep showing a
  // student from the data source the list is no longer rendering, while nothing in the visible
  // list is actually marked `selected`. Only fires on the false -> true transition: a thread
  // opened from a search hit (or re-confirmed by a later keystroke while still searching) must
  // not be cleared on every subsequent render.
  useEffect(() => {
    if (isSearching && !wasSearchingRef.current) {
      setOpen(null);
      setDraft('');
    }
    wasSearchingRef.current = isSearching;
  }, [isSearching]);

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
        return mergeConversation(current, {
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
        });
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('communication.sendError'));
    } finally {
      setSending(false);
    }
  };

  /**
   * Teacher-only fan-out (`communication.send_group_message` stays out of scope — BR-M01/BR-M02
   * freeze one conversation per child per destination). This loops over the whole class roster
   * and calls the same `sendMessage` the single-student composer uses, once per student, so each
   * send just appends to — or creates — that student's own 1:1 teacher conversation. Nothing is
   * shared across students.
   */
  const handleBulkSend = async () => {
    if (!schoolId || bulkSending) {
      return;
    }

    const body = bulkDraft.trim();
    if (!body || roster.length === 0) {
      return;
    }

    setBulkConfirmOpen(false);
    setBulkSending(true);
    setBulkError(null);

    const results = await Promise.allSettled(
      roster.map((row) =>
        sendMessage(schoolId, {
          student_id: row.student_id,
          audience: 'teacher',
          teacher_id: row.teacher_id ?? undefined,
          body,
        }).then((sent) => ({ row, sent })),
      ),
    );

    const failedNames: string[] = [];

    setConversations((current) => {
      let next = current;
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          const { row, sent } = result.value;
          const existing = next.find((item) => item.id === sent.conversation_id);
          next = mergeConversation(next, {
            id: sent.conversation_id,
            student_id: row.student_id,
            student_name: row.student_name,
            audience: 'teacher',
            teacher_id: row.teacher_id ?? null,
            teacher_name: existing?.teacher_name ?? null,
            last_message_at: sent.message.sent_at,
            last_message_body: sent.message.body,
            school_class_id: existing?.school_class_id ?? classId,
            sender_line: existing?.sender_line || row.student_name,
          });
        }
      });
      return next;
    });

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        failedNames.push(roster[index].student_name);
      }
    });

    setBulkSending(false);

    if (failedNames.length > 0) {
      // Keep the draft and the composer open so the teacher can see what happened and retry —
      // same as a single failed send leaves its draft in place. The failure shows inside the
      // composer (not the page-level banner): once the dialog reopens, the rest of the page is
      // `aria-hidden` behind it, so a banner left out there would be invisible to a screen reader.
      setBulkOpen(true);
      setBulkError(
        t('communication.bulk.partialError', {
          count: failedNames.length,
          names: failedNames.join(', '),
        }),
      );
    } else {
      setBulkDraft('');
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
  // Same filter for both sources: a roster/search row that already has a conversation showing in
  // the inbox above does not need a second "start here" row.
  const filterStarters = (rows: CommunicationRosterItem[]) =>
    rows.filter((row) => {
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
  const starters = filterStarters(roster);

  const currentSchoolClass = classes.find((item) => item.id === classId) ?? null;
  const currentClassLabel = currentSchoolClass ? schoolClassLabel(currentSchoolClass, t) : '';
  const canBulkSend = !isSearching && isTeacher && classId != null && roster.length > 0;

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

                {/*
                  Both start-a-conversation buttons are `fullWidth` — same width as the search
                  field below them — so they read as a matched pair instead of each
                  shrink-wrapping to its own label length ("Nova conversa" vs. "Enviar para toda
                  a turma").
                */}
                <Button
                  size="small"
                  variant="contained"
                  fullWidth
                  onClick={() => {
                    setOpen(null);
                    setDraft('');
                    setSearchQuery('');
                    setStarterOpen(true);
                  }}
                >
                  {t('communication.start.heading')}
                </Button>

                {canBulkSend && (
                  <Button
                    size="small"
                    variant="contained"
                    fullWidth
                    disabled={bulkSending}
                    onClick={() => {
                      setBulkDraft('');
                      setBulkError(null);
                      setBulkOpen(true);
                    }}
                    startIcon={bulkSending ? <CircularProgress size={14} /> : undefined}
                  >
                    {t('communication.bulk.button')}
                  </Button>
                )}

                {/*
                  The Turma picker and the browse-by-class roster list used to sit here,
                  permanently rendered above the inbox. They now live inside the "Nova conversa"
                  dialog (below, outside this list) so this column shows exactly one list of
                  conversations — the inbox, or search results while searching — never a second,
                  always-visible roster browser mixed in above it.
                */}

                <SearchField
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={t('communication.search.placeholder')}
                  ariaLabel={t('communication.search.aria')}
                  fullWidth
                />

                <Typography variant="subtitle2">{t('communication.inbox.heading')}</Typography>

                {/*
                  Search narrows this list the same way it narrows Students.tsx/Guardians.tsx: a
                  hit is just another CommunicationRosterItem, so it reuses the exact
                  onClick/selection logic a roster row uses to open — or start — a conversation.
                  Unlike the "Nova conversa" dialog's roster list, this one is not filtered
                  against the inbox: it *replaces* the inbox while searching, so a hit with an
                  existing conversation must still show (and opening it resolves to that thread
                  via `rosterThreadId`) — filtering it out here would hide the very conversation
                  the search box exists to find.
                */}
                {/*
                  Capped and independently scrollable (see chatPanelLayout.ts) so a long inbox —
                  or many search hits — scrolls here instead of growing the page.
                */}
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                    maxHeight: CHAT_PANEL_HEIGHT_PX,
                    overflow: 'auto',
                    // See the roster box above — same at-rest scrollbar affordance (visibility +
                    // `neutral.main` thumb, since the default thumb color matches this card's own
                    // background.paper surface) so the capped inbox/search list does not look like
                    // a complete, un-scrollable set.
                    '&::-webkit-scrollbar': {
                      visibility: 'visible',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      visibility: 'visible',
                      bgcolor: 'neutral.main',
                    },
                  }}
                >
                  {isSearching ? (
                    searchLoading ? (
                      <Box display="flex" justifyContent="center" py={2}>
                        <CircularProgress size={24} />
                      </Box>
                    ) : searchResults.length === 0 ? (
                      <EmptyState
                        title={t('communication.search.empty.title')}
                        description={t('communication.search.empty.description', {
                          query: trimmedSearchQuery,
                        })}
                      />
                    ) : (
                      searchResults.map((row) => (
                        <ConversationRow
                          key={row.student_id}
                          label={row.student_name}
                          detail={guardianDetail(row, t)}
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
                    )
                  ) : conversationsLoading ? (
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
                </Box>
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

      {/*
        "Nova conversa" opens this instead of permanently showing the Turma select + roster list
        in the sidebar (see the comment above the removed block). Same two pieces, same reused
        onClick as the old inline roster row — just scoped to a dialog so starting a conversation
        is a deliberate Turma -> student flow instead of always-on clutter above the inbox.
      */}
      <Dialog open={starterOpen} onClose={() => setStarterOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('communication.start.heading')}</DialogTitle>
        <DialogContent>
          <Stack direction="column" spacing={1.5} sx={{ pt: 0.5 }}>
            {classes.length > 0 && (
              <TextField
                id="communication-start-class"
                label={t('communication.class')}
                value={classId == null ? '' : String(classId)}
                onChange={(event) => setClassId(Number(event.target.value))}
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

            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                maxHeight: CHAT_PANEL_HEIGHT_PX,
                overflow: 'auto',
                '&::-webkit-scrollbar': {
                  visibility: 'visible',
                },
                '&::-webkit-scrollbar-thumb': {
                  visibility: 'visible',
                  bgcolor: 'neutral.main',
                },
              }}
            >
              {rosterLoading ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress size={24} />
                </Box>
              ) : classId != null && roster.length === 0 ? (
                <EmptyState
                  title={t('communication.empty.roster.title')}
                  description={t('communication.empty.roster.description')}
                />
              ) : classId != null && starters.length === 0 ? (
                <EmptyState
                  title={t('communication.empty.rosterStarted.title')}
                  description={t('communication.empty.rosterStarted.description')}
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
                      setSearchQuery('');
                      setStarterOpen(false);
                    }}
                  />
                ))
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStarterOpen(false)} color="inherit">
            {t('common.cancel')}
          </Button>
        </DialogActions>
      </Dialog>

      {isTeacher && (
        <Dialog
          open={bulkOpen}
          onClose={() => {
            setBulkOpen(false);
            setBulkDraft('');
            setBulkError(null);
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>{t('communication.bulk.composerTitle')}</DialogTitle>
          <DialogContent>
            <Stack direction="column" spacing={1.5} sx={{ pt: 0.5 }}>
              {bulkError && <ErrorBanner message={bulkError} />}
              <Typography variant="body2" color="text.secondary">
                {t('communication.bulk.composerHelp', {
                  count: roster.length,
                  class: currentClassLabel,
                })}
              </Typography>
              <TextField
                autoFocus
                fullWidth
                multiline
                minRows={4}
                placeholder={t('communication.placeholder')}
                value={bulkDraft}
                onChange={(event) => setBulkDraft(event.target.value)}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setBulkOpen(false);
                setBulkDraft('');
                setBulkError(null);
              }}
              color="inherit"
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="contained"
              disabled={bulkDraft.trim().length === 0 || roster.length === 0}
              onClick={() => {
                setBulkOpen(false);
                setBulkConfirmOpen(true);
              }}
            >
              {t('communication.send')}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {isTeacher && (
        <ConfirmDialog
          open={bulkConfirmOpen}
          title={t('communication.bulk.confirmTitle')}
          message={t('communication.bulk.confirmMessage', {
            count: roster.length,
            class: currentClassLabel,
          })}
          confirmLabel={t('communication.send')}
          cancelLabel={t('common.cancel')}
          onCancel={() => {
            setBulkConfirmOpen(false);
            setBulkOpen(true);
          }}
          onConfirm={handleBulkSend}
        />
      )}
    </Stack>
  );
};

export default StaffCommunication;
