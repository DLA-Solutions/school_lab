import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { Theme } from '@mui/material/styles';
import IconifyIcon from '../IconifyIcon';

export type ContextBadgeVariant = 'platform' | 'staff' | 'teacher' | 'guardian';

export interface ContextBadgeProps {
  variant: ContextBadgeVariant;
  label: string;
  secondaryLabel?: string;
  tooltip?: string;
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  /** Sidebar-style badge: fit-content, single-line role · school, softer staff/platform styling. */
  compact?: boolean;
}

const VARIANT_ICON: Record<ContextBadgeVariant, string> = {
  platform: 'mingcute:building-2-line',
  staff: 'mingcute:school-line',
  teacher: 'mingcute:book-6-line',
  guardian: 'mingcute:group-2-line',
};

const badgeSurfaceSx = (variant: ContextBadgeVariant, compact?: boolean) => {
  if (variant === 'staff' || variant === 'platform') {
    if (compact) {
      return (theme: Theme) => ({
        color: theme.palette.text.secondary,
        borderColor: theme.palette.divider,
        bgcolor: 'transparent',
        '& .context-badge-icon': {
          color: theme.palette.text.secondary,
        },
      });
    }

    return (theme: Theme) => ({
      color: theme.palette.text.secondary,
      borderColor: theme.palette.divider,
      bgcolor: theme.palette.surface.alt,
      '& .context-badge-icon': {
        color: theme.palette.text.secondary,
      },
    });
  }

  const colorKey = variant === 'teacher' ? 'info' : 'success';

  return (theme: Theme) => ({
    color: `${colorKey}.main`,
    borderColor: theme.palette.transparent[colorKey].main,
    bgcolor: theme.palette.transparent[colorKey].main,
    '& .context-badge-icon': {
      color: `${colorKey}.main`,
    },
  });
};

const ContextBadge = ({
  variant,
  label,
  secondaryLabel,
  tooltip,
  onClick,
  compact = false,
}: ContextBadgeProps) => {
  const displayLabel = compact && secondaryLabel ? `${label} · ${secondaryLabel}` : label;

  const content = (
    <Stack
      spacing={compact ? 0 : 0.5}
      alignItems="flex-start"
      width={compact ? 'fit-content' : 1}
      sx={{ maxWidth: '100%' }}
    >
      <Box
        component={onClick ? ButtonBase : 'div'}
        onClick={onClick}
        disableRipple={!onClick}
        aria-label={onClick ? (tooltip ?? displayLabel) : undefined}
        sx={(theme) => ({
          width: compact ? 'fit-content' : 1,
          maxWidth: '100%',
          justifyContent: 'flex-start',
          textAlign: 'left',
          borderRadius: compact ? 1 : 999,
          px: compact ? 1 : 1.25,
          py: compact ? 0.25 : 0.5,
          border: '1px solid',
          ...badgeSurfaceSx(variant, compact)(theme),
          ...(onClick
            ? {
                cursor: 'pointer',
                transition: theme.transitions.create(['border-color', 'background-color'], {
                  duration: theme.transitions.duration.shorter,
                }),
                '&:hover': {
                  borderColor: theme.palette.text.secondary,
                },
              }
            : {}),
        })}
      >
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0, maxWidth: '100%' }}>
          <IconifyIcon
            icon={VARIANT_ICON[variant]}
            className="context-badge-icon"
            sx={{ fontSize: compact ? 14 : 16, flexShrink: 0 }}
          />
          <Typography
            variant="caption"
            fontWeight={compact ? 500 : 600}
            lineHeight={1.3}
            noWrap
            sx={{ minWidth: 0 }}
          >
            {displayLabel}
          </Typography>
          {onClick && (
            <IconifyIcon
              icon="mingcute:down-line"
              sx={{ fontSize: 14, color: 'text.secondary', flexShrink: 0 }}
            />
          )}
        </Stack>
      </Box>

      {secondaryLabel && !compact && (
        <Typography
          variant="caption"
          color="text.secondary"
          noWrap
          sx={{ px: 0.5, maxWidth: 1 }}
        >
          {secondaryLabel}
        </Typography>
      )}
    </Stack>
  );

  if (tooltip && !onClick) {
    return (
      <Tooltip title={tooltip} placement="bottom-start">
        <Box width={compact ? 'fit-content' : 1} sx={{ maxWidth: '100%' }}>
          {content}
        </Box>
      </Tooltip>
    );
  }

  if (tooltip && onClick) {
    return (
      <Tooltip title={tooltip} placement="bottom-start">
        {content}
      </Tooltip>
    );
  }

  return content;
};

export default ContextBadge;
