import { ChangeEvent, useState } from 'react';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconifyIcon from 'components/base/IconifyIcon';
import { PASSWORD_RULES } from 'utils/passwordStrength';

export interface PasswordStrengthFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  /** Hides the checklist until someone starts typing, so an empty form is not a list of failures. */
  showRules?: boolean;
}

const PasswordStrengthField = ({
  id,
  label,
  value,
  onChange,
  disabled,
  error,
  showRules = true,
}: PasswordStrengthFieldProps) => {
  const [visible, setVisible] = useState(false);

  return (
    <Stack direction="column" gap={1}>
      <TextField
        id={id}
        name={id}
        label={label}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        error={Boolean(error)}
        helperText={error}
        disabled={disabled}
        variant="filled"
        fullWidth
        autoComplete="new-password"
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
                  onClick={() => setVisible((current) => !current)}
                  edge="end"
                >
                  <IconifyIcon icon={visible ? 'mingcute:eye-line' : 'mingcute:eye-close-line'} />
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />

      {showRules && value.length > 0 && (
        <Stack component="ul" direction="column" gap={0.5} sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {PASSWORD_RULES.map((rule) => {
            const met = rule.test(value);

            return (
              <Stack
                component="li"
                key={rule.key}
                direction="row"
                gap={0.75}
                alignItems="center"
                // Not colour alone: the icon changes too, so the state is readable without it.
                color={met ? 'success.main' : 'text.secondary'}
              >
                <IconifyIcon
                  icon={met ? 'mingcute:check-circle-fill' : 'mingcute:circle-line'}
                  aria-hidden
                />
                <Typography variant="caption">{rule.label}</Typography>
              </Stack>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
};

export default PasswordStrengthField;
