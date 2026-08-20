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
}

const VARIANT_ICON: Record<ContextBadgeVariant, string> = {
  platform: 'mingcute:building-2-line',
  staff: 'mingcute:school-line',
  teacher: 'mingcute:book-6-line',
  guardian: 'mingcute:group-2-line',
};

const badgeSurfaceSx = (variant: ContextBadgeVariant) => {
  if (variant === 'staff' || variant === 'platform') {
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

const ContextBadge = ({ variant, label, secondaryLabel, tooltip, onClick }: ContextBadgeProps) => {
  const content = (
    <Stack spacing={0.5} alignItems="flex-start" width={1}>
      <Box
        component={onClick ? ButtonBase : 'div'}
        onClick={onClick}
        disableRipple={!onClick}
        aria-label={onClick ? tooltip ?? label : undefined}
        sx={(theme) => ({
          width: 1,
          justifyContent: 'flex-start',
          textAlign: 'left',
          borderRadius: 999,
          px: 1.25,
          py: 0.5,
          border: '1px solid',
          ...badgeSurfaceSx(variant)(theme),
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
        <Stack direction="row" spacing={0.75} alignItems="center" width={1}>
          <IconifyIcon
            icon={VARIANT_ICON[variant]}
            className="context-badge-icon"
            sx={{ fontSize: 16, flexShrink: 0 }}
          />
          <Typography
            variant="caption"
            fontWeight={600}
            lineHeight={1.3}
            noWrap
            sx={{ flex: 1, minWidth: 0 }}
          >
            {label}
          </Typography>
          {onClick && (
            <IconifyIcon
              icon="mingcute:down-line"
              sx={{ fontSize: 14, color: 'text.secondary', flexShrink: 0 }}
            />
          )}
        </Stack>
      </Box>

      {secondaryLabel && (
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
        <Box width={1}>{content}</Box>
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
