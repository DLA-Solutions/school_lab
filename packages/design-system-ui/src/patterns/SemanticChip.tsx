import Chip from '@mui/material/Chip';
import IconifyIcon from '../IconifyIcon';

export type SemanticChipVariant = 'success' | 'warning' | 'error' | 'info';

export interface SemanticChipProps {
  variant: SemanticChipVariant;
  label: string;
  width?: number | string;
}

const variantIcon: Record<SemanticChipVariant, string> = {
  success: 'radix-icons:dot-filled',
  warning: 'radix-icons:dot-filled',
  error: 'radix-icons:dot-filled',
  info: 'radix-icons:dot-filled',
};

const SemanticChip = ({ variant, label, width }: SemanticChipProps) => {
  const colorKey = variant === 'info' ? 'info' : variant;

  return (
    <Chip
      variant="outlined"
      size="small"
      icon={
        <IconifyIcon
          icon={variantIcon[variant]}
          sx={(theme) => ({
            color: `${(theme.vars || theme).palette[colorKey].main} !important`,
          })}
        />
      }
      label={label}
      sx={{
        pr: 0.65,
        width: width ?? 'auto',
        justifyContent: 'center',
        color: `${colorKey}.main`,
        letterSpacing: 0.5,
        bgcolor: `transparent.${colorKey}.main`,
        borderColor: `transparent.${colorKey}.main`,
      }}
    />
  );
};

export default SemanticChip;
