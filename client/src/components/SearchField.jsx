import { CloseRounded, SearchRounded } from '@mui/icons-material';
import { IconButton, InputAdornment, TextField } from '@mui/material';

export function SearchField({ value, onChange, label = 'Search candidates', sx, ...props }) {
  return (
    <TextField
      {...props}
      label={label}
      value={value}
      onChange={onChange}
      size="small"
      sx={{ minWidth: 0, ...sx }}
      slotProps={{
        input: {
          startAdornment: <InputAdornment position="start"><SearchRounded color="primary" fontSize="small" /></InputAdornment>,
          endAdornment: value ? <InputAdornment position="end"><IconButton size="small" aria-label={`Clear ${label.toLowerCase()}`} onClick={() => onChange({ target: { value: '' } })}><CloseRounded fontSize="small" /></IconButton></InputAdornment> : null,
        },
      }}
    />
  );
}
