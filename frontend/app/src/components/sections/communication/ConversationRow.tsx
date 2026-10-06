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
        cursor: 'pointer',
        px: 1.5,
        py: 1.25,
        borderRadius: 1,
        // The native button face stays light under a transparent background, so dark-scheme
        // `text.primary` disappears on it. `appearance: none` removes that face; the row then
        // paints its own surface. Selected uses `background.default` and a `primary.main`
        // border: `surface.alt` sits next to paper in dark, and this theme's `action.selected`
        // is the same light scrim in both schemes.
        appearance: 'none',
        WebkitAppearance: 'none',
        border: 1,
        borderColor: selected ? 'primary.main' : 'divider',
        bgcolor: selected ? 'background.default' : 'background.paper',
        color: 'text.primary',
        font: 'inherit',
        '&:hover': {
          borderColor: selected ? 'primary.main' : 'text.secondary',
          bgcolor: selected ? 'background.default' : 'surface.alt',
        },
        '&:focus-visible': {
          outline: '2px solid',
          outlineColor: 'primary.main',
          outlineOffset: 2,
        },
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" color="text.primary">
          {label}
        </Typography>
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
