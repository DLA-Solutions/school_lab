import { ChangeEvent } from 'react';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconifyIcon from 'components/base/IconifyIcon';

export interface SearchFieldProps {
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  fullWidth?: boolean;
  sx?: object;
}

const SearchField = ({
  value,
  onChange,
  placeholder = 'Search for...',
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
      }}
    />
  );
};

export default SearchField;
