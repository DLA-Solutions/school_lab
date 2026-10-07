import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { EmptyState } from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { ConversationMessage } from 'types/communication';
import { formatChatTime } from './formatChatTime';

interface MessageThreadProps {
  /** Who this thread is with, and which child. Stays visible when the list hides on a phone. */
  heading?: string | null;
  messages: ConversationMessage[];
  loading: boolean;
  membershipId: number | null;
  draft: string;
  sending: boolean;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  /** Direction cannot send until a destination is chosen. Defaults to ready. */
  sendEnabled?: boolean;
  /** Shown when send is blocked for a reason the person can act on. */
  sendDisabledReason?: string | null;
}

/**
 * The open thread. The current person's bubbles sit on `background.paper`; the other side sits
 * on the theme's alternate surface. Each bubble names whoever spoke (`sender_line`).
 */
const MessageThread = ({
  heading,
  messages,
  loading,
  membershipId,
  draft,
  sending,
  onDraftChange,
  onSend,
  sendEnabled = true,
  sendDisabledReason = null,
}: MessageThreadProps) => {
  const { t, locale } = useTranslation();
  const canSend = sendEnabled && draft.trim().length > 0 && !sending;
  const showSpinner = loading && messages.length === 0;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 360,
        bgcolor: 'background.default',
        borderRadius: 1,
      }}
    >
      {heading ? (
        <Typography variant="subtitle1" component="h2" sx={{ px: 1.5, pt: 1.5 }}>
          {heading}
        </Typography>
      ) : null}

      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 1.5,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          // The app hides the webkit scrollbar until hover (theme/styles/scrollbar.ts); this pane
          // is height-capped by its ChatColumns parent (see chatPanelLayout.ts) so it needs the
          // same at-rest affordance as the list column beside it — otherwise a thread with more
          // messages above the fold looks like it has nothing more to scroll to. `neutral.main`
          // for the thumb (not the base `background.paper`, which is too close to this pane's own
          // `background.default` to read as a distinct thumb) — same color the theme already
          // picked for a scrollbar that must stay visible (scrollbar.ts's `@supports
          // (-moz-appearance:none)` branch).
          '&::-webkit-scrollbar': {
            visibility: 'visible',
          },
          '&::-webkit-scrollbar-thumb': {
            visibility: 'visible',
            bgcolor: 'neutral.main',
          },
        }}
      >
        {showSpinner ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        ) : messages.length === 0 ? (
          <EmptyState
            title={t('communication.empty.thread.title')}
            description={t('communication.empty.thread.description')}
          />
        ) : (
          messages.map((message) => {
            const mine = membershipId != null && message.sender_membership_id === membershipId;

            return (
              <Box
                key={message.id}
                sx={{
                  alignSelf: mine ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                  px: 1.5,
                  py: 1,
                  borderRadius: 2,
                  bgcolor: mine ? 'background.paper' : 'surface.alt',
                }}
              >
                {message.sender_line ? (
                  <Typography variant="caption" color="text.secondary" display="block">
                    {message.sender_line}
                  </Typography>
                ) : null}
                <Typography variant="body2">{message.body}</Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {formatChatTime(message.sent_at, locale)}
                </Typography>
              </Box>
            );
          })
        )}
      </Box>

      <Stack direction="column" spacing={0.75} sx={{ p: 1.5 }}>
        {sendDisabledReason ? (
          <Typography variant="body2" color="text.secondary">
            {sendDisabledReason}
          </Typography>
        ) : null}
        {/*
          Measured live (MuiOutlinedInput-root vs. the Button's own box, both border-box):
          size="small" renders this app's themed OutlinedInput at ~35px tall, while a
          size="medium" contained Button renders at ~40px — close enough to look like a typo, far
          enough to visibly step down against the input beside it. Pinning both to the same
          explicit `height` (rather than hunting for a `size` pairing that happens to match) is
          the one value that cannot drift as either component's theme padding changes later.
        */}
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            fullWidth
            size="small"
            placeholder={t('communication.placeholder')}
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                if (canSend) {
                  onSend();
                }
              }
            }}
            slotProps={{ input: { sx: { height: 40 } } }}
          />
          <Button
            variant="contained"
            size="medium"
            onClick={onSend}
            disabled={!canSend}
            sx={{ px: 3.5, flexShrink: 0, height: 40 }}
          >
            {t('communication.send')}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
};

export default MessageThread;
