import { useEffect, useState } from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { EmptyState } from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import {
  AttachmentReader,
  MessageAudience,
  listMessages,
} from 'services/communicationApi';
import { showDailyRoutine, showMyDailyRoutine } from 'services/dailyRoutinesApi';
import { ThreadMessage } from 'types/communication';
import { DailyRoutine } from 'types/dailyRoutine';
import { communicationErrorText } from 'utils/communicationError';
import AttachmentMedia from './AttachmentMedia';
import RoutineStory from './RoutineStory';

interface ThreadTranscriptProps {
  schoolId: number;
  studentId: number;
  audience: MessageAudience;
  membershipId: number;
}

const readerFor = (audience: MessageAudience): AttachmentReader =>
  audience === 'guardian' ? 'guardian' : 'staff';

/**
 * The private thread. A routine line is the day card, not a copy of the narrative.
 * A reply is another line on this same thread.
 */
const ThreadTranscript = ({ schoolId, studentId, audience, membershipId }: ThreadTranscriptProps) => {
  const { t, locale } = useTranslation();
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const rows = await listMessages(schoolId, studentId, audience);
        if (!cancelled) {
          setMessages(rows);
        }
      } catch (err) {
        if (!cancelled) {
          setMessages([]);
          setError(communicationErrorText(err, t, 'communication.loadError'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [schoolId, studentId, audience, t]);

  if (loading) {
    return (
      <Stack alignItems="center" py={4}>
        <CircularProgress />
      </Stack>
    );
  }

  if (error) {
    return (
      <Typography variant="body2" color="error" role="alert">
        {error}
      </Typography>
    );
  }

  if (messages.length === 0) {
    return (
      <EmptyState
        title={t('communication.thread.empty.title')}
        description={t(
          audience === 'guardian'
            ? 'communication.thread.empty.guardianDescription'
            : 'communication.thread.empty.description',
        )}
        headingLevel={3}
      />
    );
  }

  const reader = readerFor(audience);

  return (
    <Stack direction="column" divider={<Divider />} gap={0}>
      {messages.map((message) => {
        const mine = message.sender_membership_id === membershipId;
        const who = mine
          ? t('communication.you')
          : audience === 'guardian'
            ? t('communication.school')
            : t('communication.family');

        return (
          <Stack key={message.id} direction="column" gap={1} py={2}>
            <Typography variant="caption" color="text.secondary">
              {who}
              {message.sent_at ? ` · ${new Date(message.sent_at).toLocaleString(locale)}` : ''}
            </Typography>
            {message.kind === 'routine' && message.daily_routine_id ? (
              <RoutineLine
                schoolId={schoolId}
                routineId={message.daily_routine_id}
                audience={audience}
              />
            ) : (
              <>
                {message.body && (
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {message.body}
                  </Typography>
                )}
                {message.attachment_ids.map((id) => (
                  <AttachmentMedia key={id} schoolId={schoolId} attachmentId={id} audience={reader} />
                ))}
              </>
            )}
          </Stack>
        );
      })}
    </Stack>
  );
};

const RoutineLine = ({
  schoolId,
  routineId,
  audience,
}: {
  schoolId: number;
  routineId: number;
  audience: MessageAudience;
}) => {
  const [routine, setRoutine] = useState<DailyRoutine | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = audience === 'guardian' ? showMyDailyRoutine : showDailyRoutine;

    load(schoolId, routineId)
      .then((row) => {
        if (!cancelled) {
          setRoutine(row);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRoutine(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [schoolId, routineId, audience]);

  if (!routine) {
    return null;
  }

  return (
    <RoutineStory
      routine={routine}
      schoolId={schoolId}
      audience={audience === 'guardian' ? 'guardian' : 'staff'}
    />
  );
};

export default ThreadTranscript;
