import { ChangeEvent } from 'react';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconifyIcon from 'components/base/IconifyIcon';

export interface SearchFieldProps {
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  /**
   * Accessible name of the input. A placeholder is not a label — it is not exposed as the
   * accessible name everywhere and it disappears once the user types. Override it whenever the
   * field searches something more specific than the page it sits on.
   */
  ariaLabel?: string;
  fullWidth?: boolean;
  sx?: object;
}

const SearchField = ({
  value,
  onChange,
  placeholder = 'Search for...',
  ariaLabel = 'Search',
  fullWidth = false,
  sx,
}: SearchFieldProps) => {
  return (
    <TextField
      variant="filled"
      size="small"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      fullWidth={fullWidth}
      sx={{ width: fullWidth ? 1 : 220, ...sx }}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <IconifyIcon icon="mingcute:search-line" />
            </InputAdornment>
          ),
        },
        htmlInput: {
          'aria-label': ariaLabel,
        },
      }}
    />
  );
};

export default SearchField;
