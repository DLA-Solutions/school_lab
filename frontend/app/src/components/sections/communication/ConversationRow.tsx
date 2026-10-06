import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { SemanticChip } from 'design-system';
import { useTranslation } from 'providers/I18nContext';
import { formatChatTime, messagePreview } from './formatChatTime';

interface ConversationRowProps {
  label: string;
  detail?: string | null;
  preview?: string | null;
  sentAt?: string | null;
  selected: boolean;
  unreadLabel?: string | null;
  onClick: () => void;
}

/**
 * One inbox or "start a thread" row. `label` is the accessible name so the preview and the
 * unread chip do not change which button a test or a keyboard user activates.
 */
const ConversationRow = ({
  label,
  detail,
  preview,
  sentAt,
  selected,
  unreadLabel,
  onClick,
}: ConversationRowProps) => {
  const { locale } = useTranslation();
  const previewText = messagePreview(preview);
  const time = sentAt ? formatChatTime(sentAt, locale) : null;

  return (
    <Box
      component="button"
      type="button"
      aria-label={label}
      aria-current={selected ? 'true' : undefined}
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 1,
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
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2">{label}</Typography>
        {detail ? (
          <Typography variant="caption" color="text.secondary" display="block">
            {detail}
          </Typography>
        ) : null}
        {previewText ? (
          <Typography variant="caption" color="text.secondary" display="block" noWrap>
            {previewText}
          </Typography>
        ) : null}
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
        {time ? (
          <Typography variant="caption" color="text.secondary">
            {time}
          </Typography>
        ) : null}
        {unreadLabel ? <SemanticChip variant="info" label={unreadLabel} /> : null}
      </Box>
    </Box>
  );
};

export default ConversationRow;
